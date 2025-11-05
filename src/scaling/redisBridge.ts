import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { SpectralEvent, SpectralError, SpectralErrorType } from '../core/types';

/**
 * Ethereal Channel - Redis pub/sub bridge for inter-process spectral communication
 * Enables distributed event synchronization across the spectral realm
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: 4 | 6;
  connectTimeout: number;
  commandTimeout: number;
}

export interface ChannelSubscription {
  channel: string;
  pattern?: string;
  handler: (message: any, channel: string) => void;
  subscribed: boolean;
  messageCount: number;
  lastMessage: number;
}

export interface RedisBridgeStatus {
  connected: boolean;
  subscriptions: number;
  publishedMessages: number;
  receivedMessages: number;
  errors: number;
  uptime: number;
  hauntLevel: number;
}

/**
 * Redis bridge for spectral communication
 */
export class RedisBridge extends EventEmitter {
  private readonly config: RedisConfig;
  private publisher: Redis;
  private subscriber: Redis;
  private subscriptions = new Map<string, ChannelSubscription>();
  private patternSubscriptions = new Map<string, ChannelSubscription>();
  
  // Metrics
  private publishedMessages = 0;
  private receivedMessages = 0;
  private errors = 0;
  private startTime = Date.now();
  private hauntLevel = 0;
  private isConnected = false;

  constructor(config: Partial<RedisConfig> = {}) {
    super();
    
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'phantom:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
      ...config,
    };

    this.initializeConnections();
  }

  /**
   * Initialize Redis connections for pub/sub
   */
  private initializeConnections(): void {
    // Publisher connection
    this.publisher = new Redis({
      ...this.config,
      lazyConnect: true,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
    });

    // Subscriber connection (separate connection required for pub/sub)
    this.subscriber = new Redis({
      ...this.config,
      lazyConnect: true,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
    });

    this.setupConnectionHandlers();
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(): void {
    // Publisher events
    this.publisher.on('connect', () => {
      console.log('🔗 Publisher connected to ethereal channel');
      this.checkConnectionStatus();
    });

    this.publisher.on('error', (error) => {
      console.error('💀 Publisher connection error:', error);
      this.handleConnectionError(error, 'publisher');
    });

    this.publisher.on('close', () => {
      console.warn('🌫️ Publisher connection closed');
      this.isConnected = false;
      this.emit('disconnected', { type: 'publisher' });
    });

    // Subscriber events
    this.subscriber.on('connect', () => {
      console.log('📡 Subscriber connected to ethereal channel');
      this.checkConnectionStatus();
    });

    this.subscriber.on('error', (error) => {
      console.error('💀 Subscriber connection error:', error);
      this.handleConnectionError(error, 'subscriber');
    });

    this.subscriber.on('close', () => {
      console.warn('🌫️ Subscriber connection closed');
      this.isConnected = false;
      this.emit('disconnected', { type: 'subscriber' });
    });

    // Message handling
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handlePatternMessage(pattern, channel, message);
    });
  }

  /**
   * Connect to Redis servers
   */
  async connect(): Promise<void> {
    try {
      console.log('🌟 Connecting to ethereal channels...');
      
      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect(),
      ]);

      this.isConnected = true;
      this.emit('connected');
      
      console.log('✨ Connected to ethereal realm via Redis');
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.REALM_COLLAPSE,
        `Failed to connect to ethereal channels: ${(error as Error).message}`,
        'RedisBridge'
      );
    }
  }

  /**
   * Disconnect from Redis servers
   */
  async disconnect(): Promise<void> {
    console.log('🌙 Disconnecting from ethereal channels...');
    
    try {
      await Promise.all([
        this.publisher.disconnect(),
        this.subscriber.disconnect(),
      ]);
      
      this.isConnected = false;
      this.subscriptions.clear();
      this.patternSubscriptions.clear();
      
      this.emit('disconnected', { type: 'all' });
      console.log('👻 Disconnected from ethereal realm');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Publish message to a channel
   */
  async publish(channel: string, message: any): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const spectralMessage = this.wrapSpectralMessage(message);
      const serialized = JSON.stringify(spectralMessage);
      
      await this.publisher.publish(this.config.keyPrefix + channel, serialized);
      
      this.publishedMessages++;
      this.emit('message_published', { channel, message: spectralMessage });
      
      // Add slight haunt probability
      if (Math.random() < 0.05) {
        this.increaseHauntLevel(0.1);
      }
    } catch (error) {
      this.handlePublishError(error as Error, channel, message);
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler: (message: any, channel: string) => void): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    const fullChannel = this.config.keyPrefix + channel;
    
    try {
      await this.subscriber.subscribe(fullChannel);
      
      this.subscriptions.set(fullChannel, {
        channel,
        handler,
        subscribed: true,
        messageCount: 0,
        lastMessage: 0,
      });
      
      console.log(`👂 Listening to spectral whispers on channel: ${channel}`);
      this.emit('subscribed', { channel });
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.DISTURBANCE_DETECTED,
        `Failed to subscribe to channel ${channel}: ${(error as Error).message}`,
        'RedisBridge'
      );
    }
  }

  /**
   * Subscribe to channel pattern
   */
  async psubscribe(pattern: string, handler: (message: any, channel: string, pattern: string) => void): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    const fullPattern = this.config.keyPrefix + pattern;
    
    try {
      await this.subscriber.psubscribe(fullPattern);
      
      this.patternSubscriptions.set(fullPattern, {
        channel: pattern,
        pattern: fullPattern,
        handler: (message, channel) => handler(message, channel, pattern),
        subscribed: true,
        messageCount: 0,
        lastMessage: 0,
      });
      
      console.log(`🔍 Watching spectral patterns: ${pattern}`);
      this.emit('pattern_subscribed', { pattern });
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.DISTURBANCE_DETECTED,
        `Failed to subscribe to pattern ${pattern}: ${(error as Error).message}`,
        'RedisBridge'
      );
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const fullChannel = this.config.keyPrefix + channel;
    
    try {
      await this.subscriber.unsubscribe(fullChannel);
      this.subscriptions.delete(fullChannel);
      
      console.log(`🔇 Stopped listening to channel: ${channel}`);
      this.emit('unsubscribed', { channel });
    } catch (error) {
      console.error(`Failed to unsubscribe from ${channel}:`, error);
    }
  }

  /**
   * Unsubscribe from pattern
   */
  async punsubscribe(pattern: string): Promise<void> {
    const fullPattern = this.config.keyPrefix + pattern;
    
    try {
      await this.subscriber.punsubscribe(fullPattern);
      this.patternSubscriptions.delete(fullPattern);
      
      console.log(`🔇 Stopped watching pattern: ${pattern}`);
      this.emit('pattern_unsubscribed', { pattern });
    } catch (error) {
      console.error(`Failed to unsubscribe from pattern ${pattern}:`, error);
    }
  }

  /**
   * Get list of subscribers for a channel
   */
  async getSubscribers(channel: string): Promise<string[]> {
    try {
      const fullChannel = this.config.keyPrefix + channel;
      const subscribers = await this.publisher.pubsub('NUMSUB', fullChannel);
      
      // Redis returns [channel, count, channel, count, ...]
      const count = subscribers[1] as number || 0;
      
      // Return array of subscriber IDs (simplified)
      return Array.from({ length: count }, (_, i) => `subscriber_${i}`);
    } catch (error) {
      console.error(`Failed to get subscribers for ${channel}:`, error);
      return [];
    }
  }

  /**
   * Get bridge status
   */
  getStatus(): RedisBridgeStatus {
    return {
      connected: this.isConnected,
      subscriptions: this.subscriptions.size + this.patternSubscriptions.size,
      publishedMessages: this.publishedMessages,
      receivedMessages: this.receivedMessages,
      errors: this.errors,
      uptime: Date.now() - this.startTime,
      hauntLevel: this.hauntLevel,
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(channel: string, message: string): void {
    const subscription = this.subscriptions.get(channel);
    if (!subscription) return;

    try {
      const parsedMessage = JSON.parse(message);
      const unwrapped = this.unwrapSpectralMessage(parsedMessage);
      
      subscription.messageCount++;
      subscription.lastMessage = Date.now();
      this.receivedMessages++;
      
      // Add haunt probability for mysterious messages
      if (unwrapped.metadata?.haunted) {
        this.increaseHauntLevel(0.05);
      }
      
      subscription.handler(unwrapped, subscription.channel);
      
      this.emit('message_received', {
        channel: subscription.channel,
        message: unwrapped,
      });
    } catch (error) {
      console.error(`Failed to process message on ${channel}:`, error);
      this.errors++;
    }
  }

  /**
   * Handle pattern messages
   */
  private handlePatternMessage(pattern: string, channel: string, message: string): void {
    const subscription = this.patternSubscriptions.get(pattern);
    if (!subscription) return;

    try {
      const parsedMessage = JSON.parse(message);
      const unwrapped = this.unwrapSpectralMessage(parsedMessage);
      
      subscription.messageCount++;
      subscription.lastMessage = Date.now();
      this.receivedMessages++;
      
      const originalChannel = channel.replace(this.config.keyPrefix, '');
      subscription.handler(unwrapped, originalChannel);
      
      this.emit('pattern_message_received', {
        pattern: subscription.channel,
        channel: originalChannel,
        message: unwrapped,
      });
    } catch (error) {
      console.error(`Failed to process pattern message on ${pattern}:`, error);
      this.errors++;
    }
  }

  /**
   * Wrap message with spectral metadata
   */
  private wrapSpectralMessage(message: any): SpectralEvent {
    if (message && typeof message === 'object' && message.type) {
      // Already a spectral event
      return {
        ...message,
        metadata: {
          ...message.metadata,
          ethereal_bridge: true,
          bridge_timestamp: Date.now(),
        },
      };
    }

    // Wrap regular message
    return {
      type: 'ethereal_message',
      source: 'RedisBridge',
      timestamp: Date.now(),
      data: message,
      metadata: {
        ethereal_bridge: true,
        bridge_timestamp: Date.now(),
        haunted: Math.random() < 0.1, // 10% chance of haunted messages
      },
    };
  }

  /**
   * Unwrap spectral message
   */
  private unwrapSpectralMessage(message: any): any {
    if (message && message.metadata?.ethereal_bridge) {
      return message;
    }
    return message;
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error, type: 'publisher' | 'subscriber'): void {
    this.errors++;
    this.increaseHauntLevel(0.2);
    
    this.emit('connection_error', { type, error: error.message });
    
    // Attempt reconnection after delay
    setTimeout(() => {
      if (!this.isConnected) {
        console.log(`🔄 Attempting to reconnect ${type}...`);
        this.connect().catch(err => {
          console.error(`Reconnection failed for ${type}:`, err);
        });
      }
    }, 5000);
  }

  /**
   * Handle publish errors
   */
  private handlePublishError(error: Error, channel: string, message: any): void {
    this.errors++;
    this.increaseHauntLevel(0.1);
    
    console.error(`Failed to publish to ${channel}:`, error);
    
    this.emit('publish_error', {
      channel,
      message,
      error: error.message,
    });
    
    throw this.createSpectralError(
      SpectralErrorType.DISTURBANCE_DETECTED,
      `Failed to publish to channel ${channel}: ${error.message}`,
      'RedisBridge'
    );
  }

  /**
   * Check if both connections are ready
   */
  private checkConnectionStatus(): void {
    const publisherReady = this.publisher.status === 'ready';
    const subscriberReady = this.subscriber.status === 'ready';
    
    if (publisherReady && subscriberReady && !this.isConnected) {
      this.isConnected = true;
      this.emit('connected');
    }
  }

  /**
   * Increase haunt level
   */
  private increaseHauntLevel(amount: number): void {
    this.hauntLevel = Math.min(1.0, this.hauntLevel + amount);
    
    // Decay haunt level over time
    setTimeout(() => {
      this.hauntLevel = Math.max(0, this.hauntLevel * 0.9);
    }, 10000);
  }

  /**
   * Create spectral error
   */
  private createSpectralError(
    type: SpectralErrorType,
    message: string,
    source: string
  ): SpectralError {
    const error = new Error(message) as SpectralError;
    error.type = type;
    error.source = source;
    error.timestamp = Date.now();
    error.haunt_level = this.hauntLevel;
    error.recovery_possible = type !== SpectralErrorType.REALM_COLLAPSE;
    
    return error;
  }
}