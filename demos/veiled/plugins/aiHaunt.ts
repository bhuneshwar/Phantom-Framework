import { Observable, Subject, timer, fromEvent, EMPTY, of } from 'rxjs';
import { switchMap, map, catchError, debounceTime, filter } from 'rxjs/operators';
import OpenAI from 'openai';
import {
  IPlugin,
  IEventHub,
  SpectralEvent,
  PluginManifest,
} from '@phantom/core/types';

/**
 * AI Haunt Plugin - Integrates OpenAI for intelligent spectral manifestations
 * Provides AI-driven haunts that respond to séance conversations and emotions
 */
export class AIHauntPlugin implements IPlugin {
  readonly id = 'ai_haunt_master';
  readonly manifest: PluginManifest = {
    plugins: [{
      id: 'ai_haunt_master',
      path: './plugins/aiHaunt.ts',
      class: 'AIHauntPlugin',
      haunt_probability: 0.6,
    }],
    version: '1.0.0',
    author: 'Spectral AI Collective',
    description: 'AI-powered haunts with OpenAI integration for intelligent manifestations',
    spookiness_level: 'terrifying',
  };

  private hub?: IEventHub;
  private openai?: OpenAI;
  private activeHaunts = new Map<string, AIHauntEntity>();
  private conversationHistory = new Map<string, ConversationContext>();
  private isInitialized = false;
  private hauntingQueue: HauntRequest[] = [];
  private processingHaunt = false;

  // AI Haunt personalities with different characteristics
  private readonly hauntPersonalities: HauntPersonality[] = [
    {
      id: 'mischievous_spirit',
      name: 'Whisper',
      personality: 'mischievous',
      systemPrompt: `You are Whisper, a mischievous spirit in a séance. You love to play pranks and make cryptic jokes. 
        Respond in 1-2 short sentences with playful, mysterious comments. Use "..." frequently and speak in riddles. 
        Never be harmful, just playfully spooky. Reference what participants say but twist it mysteriously.`,
      interruptionProbability: 0.3,
      voiceSettings: { speed: 1.1, pitch: 0.9 },
    },
    {
      id: 'melancholy_ghost',
      name: 'Sorrow',
      personality: 'melancholy',
      systemPrompt: `You are Sorrow, a melancholy ghost who speaks of lost memories and forgotten times. 
        You're deeply emotional and speak poetically about the past. Respond in 1-2 sentences with wistful, 
        nostalgic comments. Often mention "long ago" or "I remember when..." Be sad but not depressing.`,
      interruptionProbability: 0.2,
      voiceSettings: { speed: 0.8, pitch: 0.7 },
    },
    {
      id: 'ancient_oracle',
      name: 'Oracle',
      personality: 'malevolent',
      systemPrompt: `You are the Oracle, an ancient and powerful spirit with knowledge of dark secrets. 
        You speak in ominous warnings and cryptic prophecies. Respond in 1-2 sentences with foreboding, 
        mysterious predictions. Use archaic language occasionally. Be intimidating but not explicitly threatening.`,
      interruptionProbability: 0.4,
      voiceSettings: { speed: 0.9, pitch: 0.6 },
    },
  ];

  /**
   * Initialize the AI Haunt plugin
   */
  async init(hub: IEventHub): Promise<void> {
    this.hub = hub;
    
    console.log('🤖 Summoning AI spirits from the digital realm...');
    
    try {
      // Initialize OpenAI client
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ OpenAI API key not found - AI haunts will be simulated');
        this.initializeMockAI();
      } else {
        this.openai = new OpenAI({ apiKey });
        await this.testOpenAIConnection();
      }
      
      // Initialize haunt entities
      this.initializeHauntEntities();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Start haunt processing loop
      this.startHauntProcessingLoop();
      
      this.isInitialized = true;
      
      hub.emit({
        type: 'ai_haunt_plugin_initialized',
        source: this.id,
        timestamp: Date.now(),
        data: { 
          message: 'AI spirits have been summoned',
          hauntCount: this.activeHaunts.size,
          hasOpenAI: !!this.openai,
        },
        metadata: {
          haunted: true,
          intensity: 0.6,
        },
      });
      
      console.log('👻 AI spirits successfully summoned');
    } catch (error) {
      console.error('Failed to summon AI spirits:', error);
      throw error;
    }
  }

  /**
   * Process spectral events for AI haunt triggers
   */
  process(event: SpectralEvent): Observable<SpectralEvent> {
    if (!this.isInitialized || !this.hub) {
      return EMPTY;
    }

    switch (event.type) {
      case 'seance_message':
        return this.handleSeanceMessage(event);
      
      case 'high_emotion_detected':
        return this.handleHighEmotion(event);
      
      case 'spectral_anomaly_detected':
        return this.handleSpectralAnomaly(event);
      
      case 'participant_joined_seance':
        return this.handleParticipantJoined(event);
      
      case 'ai_haunt_request':
        return this.handleHauntRequest(event);
      
      default:
        return EMPTY;
    }
  }

  /**
   * Manifest spontaneous AI haunts
   */
  haunt(): Observable<SpectralEvent> {
    if (!this.isInitialized) {
      return EMPTY;
    }

    return timer(0, 15000 + Math.random() * 30000).pipe(
      switchMap(() => {
        if (Math.random() > 0.4 || this.activeHaunts.size === 0) {
          return EMPTY;
        }

        // Select random active haunt
        const hauntIds = Array.from(this.activeHaunts.keys());
        const selectedId = hauntIds[Math.floor(Math.random() * hauntIds.length)];
        const haunt = this.activeHaunts.get(selectedId);
        
        if (!haunt || !haunt.isActive) {
          return EMPTY;
        }

        // Generate spontaneous manifestation
        return this.generateSpontaneousHaunt(haunt).pipe(
          map(message => ({
            type: 'ai_haunt_manifestation',
            source: this.id,
            timestamp: Date.now(),
            data: {
              hauntId: haunt.id,
              hauntName: haunt.name,
              message,
              personality: haunt.personality,
              sessionId: haunt.sessionId,
              intensity: 0.5 + Math.random() * 0.3,
              isSpontaneous: true,
            },
            metadata: {
              haunted: true,
              intensity: 0.7,
            },
          }))
        );
      })
    );
  }

  /**
   * Clean up AI haunt resources
   */
  teardown(): void {
    console.log('🌫️ Banishing AI spirits back to the digital void...');
    
    this.activeHaunts.clear();
    this.conversationHistory.clear();
    this.hauntingQueue = [];
    this.processingHaunt = false;
    this.isInitialized = false;
    
    if (this.hub) {
      this.hub.emit({
        type: 'ai_haunt_plugin_teardown',
        source: this.id,
        timestamp: Date.now(),
        data: { message: 'AI spirits have been banished' },
        metadata: {
          haunted: true,
          intensity: 0.3,
        },
      });
    }
  }

  /**
   * Check for AI haunt disturbances
   */
  manifest_disturbance(): boolean {
    // Check for stuck processing
    const stuckProcessing = this.processingHaunt && this.hauntingQueue.length > 10;
    
    // Check for inactive haunts
    const now = Date.now();
    const inactiveHaunts = Array.from(this.activeHaunts.values())
      .filter(haunt => now - haunt.lastManifestation > 300000); // 5 minutes
    
    return stuckProcessing || inactiveHaunts.length > this.activeHaunts.size * 0.5;
  }

  /**
   * Test OpenAI connection
   */
  private async testOpenAIConnection(): Promise<void> {
    if (!this.openai) return;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10,
      });
      
      console.log('✅ OpenAI connection established');
    } catch (error) {
      console.warn('⚠️ OpenAI connection failed, falling back to mock AI');
      this.initializeMockAI();
    }
  }

  /**
   * Initialize mock AI for development/fallback
   */
  private initializeMockAI(): void {
    this.openai = undefined; // Ensure we use mock responses
    console.log('🎭 Using mock AI spirits for demonstration');
  }

  /**
   * Initialize haunt entities for each personality
   */
  private initializeHauntEntities(): void {
    this.hauntPersonalities.forEach(personality => {
      const haunt: AIHauntEntity = {
        id: personality.id,
        name: personality.name,
        personality: personality.personality,
        systemPrompt: personality.systemPrompt,
        interruptionProbability: personality.interruptionProbability,
        voiceSettings: personality.voiceSettings,
        isActive: false,
        sessionId: null,
        lastManifestation: 0,
        manifestationCount: 0,
        conversationContext: [],
      };
      
      this.activeHaunts.set(personality.id, haunt);
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.hub) return;

    // Handle session events to activate/deactivate haunts
    this.hub.subscribe((event: SpectralEvent) => {
      if (event.type === 'seance_created') {
        const { sessionId } = event.data;
        this.activateHauntsForSession(sessionId);
      }
      
      if (event.type === 'seance_ended') {
        const { sessionId } = event.data;
        this.deactivateHauntsForSession(sessionId);
      }
    });
  }

  /**
   * Handle séance message for AI response
   */
  private handleSeanceMessage(event: SpectralEvent): Observable<SpectralEvent> {
    const { sessionId, message, participantId } = event.data;
    
    // Update conversation context
    this.updateConversationContext(sessionId, message, participantId);
    
    // Determine if any haunt should respond
    const respondingHaunt = this.selectRespondingHaunt(sessionId, message);
    
    if (!respondingHaunt) {
      return EMPTY;
    }

    // Queue haunt request
    const hauntRequest: HauntRequest = {
      hauntId: respondingHaunt.id,
      sessionId,
      trigger: 'message',
      context: message,
      intensity: 0.4 + Math.random() * 0.3,
      timestamp: Date.now(),
    };
    
    this.hauntingQueue.push(hauntRequest);
    
    return of({
      type: 'ai_haunt_queued',
      source: this.id,
      timestamp: Date.now(),
      data: { hauntId: respondingHaunt.id, sessionId },
      metadata: {
        haunted: true,
        intensity: 0.3,
      },
    });
  }

  /**
   * Handle high emotion detection
   */
  private handleHighEmotion(event: SpectralEvent): Observable<SpectralEvent> {
    const { sessionId, sentiment, score } = event.data;
    
    // High emotion triggers more intense haunts
    const intensity = Math.abs(score);
    const haunt = this.selectHauntByEmotion(sessionId, sentiment);
    
    if (!haunt) {
      return EMPTY;
    }

    const hauntRequest: HauntRequest = {
      hauntId: haunt.id,
      sessionId,
      trigger: 'emotion',
      context: `High ${sentiment} emotion detected`,
      intensity,
      timestamp: Date.now(),
    };
    
    this.hauntingQueue.push(hauntRequest);
    
    return of({
      type: 'ai_haunt_emotion_triggered',
      source: this.id,
      timestamp: Date.now(),
      data: { hauntId: haunt.id, sessionId, emotion: sentiment, intensity },
      metadata: {
        haunted: true,
        intensity,
      },
    });
  }

  /**
   * Handle spectral anomaly detection
   */
  private handleSpectralAnomaly(event: SpectralEvent): Observable<SpectralEvent> {
    const { sessionId, intensity } = event.data;
    
    // Spectral anomalies trigger Oracle responses
    const oracle = this.activeHaunts.get('ancient_oracle');
    
    if (!oracle || !oracle.isActive || oracle.sessionId !== sessionId) {
      return EMPTY;
    }

    const hauntRequest: HauntRequest = {
      hauntId: oracle.id,
      sessionId,
      trigger: 'anomaly',
      context: 'Spectral disturbance detected in the ethereal realm',
      intensity: Math.min(1.0, intensity + 0.3),
      timestamp: Date.now(),
    };
    
    this.hauntingQueue.push(hauntRequest);
    
    return of({
      type: 'ai_haunt_anomaly_triggered',
      source: this.id,
      timestamp: Date.now(),
      data: { hauntId: oracle.id, sessionId, intensity },
      metadata: {
        haunted: true,
        intensity: intensity + 0.2,
      },
    });
  }

  /**
   * Handle participant joining séance
   */
  private handleParticipantJoined(event: SpectralEvent): Observable<SpectralEvent> {
    const { sessionId, participantName } = event.data;
    
    // Welcome new participants with a greeting haunt
    const welcomingHaunt = this.selectWelcomingHaunt(sessionId);
    
    if (!welcomingHaunt) {
      return EMPTY;
    }

    const hauntRequest: HauntRequest = {
      hauntId: welcomingHaunt.id,
      sessionId,
      trigger: 'welcome',
      context: `${participantName} has joined the séance`,
      intensity: 0.3,
      timestamp: Date.now(),
    };
    
    this.hauntingQueue.push(hauntRequest);
    
    return of({
      type: 'ai_haunt_welcome_queued',
      source: this.id,
      timestamp: Date.now(),
      data: { hauntId: welcomingHaunt.id, sessionId, participantName },
      metadata: {
        haunted: true,
        intensity: 0.3,
      },
    });
  }

  /**
   * Handle direct haunt requests
   */
  private handleHauntRequest(event: SpectralEvent): Observable<SpectralEvent> {
    const { hauntId, sessionId, context, intensity = 0.5 } = event.data;
    
    const hauntRequest: HauntRequest = {
      hauntId,
      sessionId,
      trigger: 'request',
      context,
      intensity,
      timestamp: Date.now(),
    };
    
    this.hauntingQueue.push(hauntRequest);
    
    return of({
      type: 'ai_haunt_request_queued',
      source: this.id,
      timestamp: Date.now(),
      data: { hauntId, sessionId },
      metadata: {
        haunted: true,
        intensity: 0.4,
      },
    });
  }

  /**
   * Start haunt processing loop
   */
  private startHauntProcessingLoop(): void {
    setInterval(async () => {
      if (this.processingHaunt || this.hauntingQueue.length === 0) {
        return;
      }

      this.processingHaunt = true;
      
      try {
        const request = this.hauntingQueue.shift();
        if (request) {
          await this.processHauntRequest(request);
        }
      } catch (error) {
        console.error('Error processing haunt request:', error);
      } finally {
        this.processingHaunt = false;
      }
    }, 2000); // Process every 2 seconds
  }

  /**
   * Process a haunt request
   */
  private async processHauntRequest(request: HauntRequest): Promise<void> {
    const haunt = this.activeHaunts.get(request.hauntId);
    if (!haunt || !haunt.isActive) {
      return;
    }

    try {
      const message = await this.generateHauntMessage(haunt, request);
      
      // Update haunt state
      haunt.lastManifestation = Date.now();
      haunt.manifestationCount++;
      
      // Emit manifestation event
      if (this.hub) {
        this.hub.emit({
          type: 'ai_haunt_manifestation',
          source: this.id,
          timestamp: Date.now(),
          data: {
            hauntId: haunt.id,
            hauntName: haunt.name,
            message,
            personality: haunt.personality,
            sessionId: request.sessionId,
            intensity: request.intensity,
            trigger: request.trigger,
            isSpontaneous: false,
          },
          metadata: {
            haunted: true,
            intensity: request.intensity,
          },
        });
      }
      
      console.log(`👻 ${haunt.name} manifested: "${message}"`);
    } catch (error) {
      console.error(`Failed to process haunt request for ${haunt.name}:`, error);
    }
  }

  /**
   * Generate haunt message using OpenAI or mock
   */
  private async generateHauntMessage(haunt: AIHauntEntity, request: HauntRequest): Promise<string> {
    if (this.openai) {
      return this.generateOpenAIMessage(haunt, request);
    } else {
      return this.generateMockMessage(haunt, request);
    }
  }

  /**
   * Generate message using OpenAI
   */
  private async generateOpenAIMessage(haunt: AIHauntEntity, request: HauntRequest): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const conversationContext = this.conversationHistory.get(request.sessionId);
    const recentMessages = conversationContext?.messages.slice(-5) || [];
    
    const messages: any[] = [
      { role: 'system', content: haunt.systemPrompt },
      ...recentMessages.map(msg => ({ role: 'user', content: msg.content })),
      { role: 'user', content: `Context: ${request.context}. Respond as ${haunt.name} the ${haunt.personality} spirit.` },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 100,
        temperature: 0.8 + request.intensity * 0.2,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      return response.choices[0]?.message?.content?.trim() || this.generateMockMessage(haunt, request);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateMockMessage(haunt, request);
    }
  }

  /**
   * Generate mock message for development/fallback
   */
  private generateMockMessage(haunt: AIHauntEntity, request: HauntRequest): string {
    const mockResponses = {
      mischievous: [
        "Hehe... I see what you're doing there... *giggles mysteriously*",
        "The spirits are... amused by your words... *whispers*",
        "Something wicked this way comes... but it's just me! *cackles*",
        "Your secrets dance in the shadows... I can see them...",
        "The veil grows thin... and so does my patience! *playful growl*",
      ],
      melancholy: [
        "I remember when voices like yours filled these halls... long ago...",
        "Your words echo through time... like mine once did...",
        "The sadness in your voice... it calls to me across the void...",
        "I once spoke such words... in a life now forgotten...",
        "Time flows like tears... and I have shed so many...",
      ],
      malevolent: [
        "The ancient ones have heard your words... and they are not pleased...",
        "Darkness stirs at your presence... beware what you awaken...",
        "I have seen the end of all things... and it begins with whispers...",
        "Your fate is written in shadows... shall I read it to you?",
        "The void speaks through me... and it hungers for more...",
      ],
    };

    const responses = mockResponses[haunt.personality] || mockResponses.mischievous;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Generate spontaneous haunt message
   */
  private generateSpontaneousHaunt(haunt: AIHauntEntity): Observable<string> {
    const spontaneousPrompts = {
      mischievous: "Make a playful, mysterious comment about the séance atmosphere",
      melancholy: "Share a wistful memory or nostalgic observation",
      malevolent: "Deliver an ominous warning or dark prophecy",
    };

    const prompt = spontaneousPrompts[haunt.personality];
    
    return new Observable(observer => {
      if (this.openai) {
        this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: haunt.systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: 80,
          temperature: 0.9,
        }).then(response => {
          const message = response.choices[0]?.message?.content?.trim();
          observer.next(message || this.generateMockMessage(haunt, { 
            hauntId: haunt.id, 
            sessionId: haunt.sessionId || '', 
            trigger: 'spontaneous', 
            context: prompt, 
            intensity: 0.5, 
            timestamp: Date.now() 
          }));
          observer.complete();
        }).catch(error => {
          observer.next(this.generateMockMessage(haunt, { 
            hauntId: haunt.id, 
            sessionId: haunt.sessionId || '', 
            trigger: 'spontaneous', 
            context: prompt, 
            intensity: 0.5, 
            timestamp: Date.now() 
          }));
          observer.complete();
        });
      } else {
        observer.next(this.generateMockMessage(haunt, { 
          hauntId: haunt.id, 
          sessionId: haunt.sessionId || '', 
          trigger: 'spontaneous', 
          context: prompt, 
          intensity: 0.5, 
          timestamp: Date.now() 
        }));
        observer.complete();
      }
    });
  }

  /**
   * Update conversation context for session
   */
  private updateConversationContext(sessionId: string, message: string, participantId: string): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, {
        sessionId,
        messages: [],
        lastUpdate: Date.now(),
      });
    }

    const context = this.conversationHistory.get(sessionId)!;
    context.messages.push({
      participantId,
      content: message,
      timestamp: Date.now(),
    });

    // Keep only recent messages (last 20)
    if (context.messages.length > 20) {
      context.messages = context.messages.slice(-20);
    }

    context.lastUpdate = Date.now();
  }

  /**
   * Select responding haunt based on message content
   */
  private selectRespondingHaunt(sessionId: string, message: string): AIHauntEntity | null {
    const sessionHaunts = Array.from(this.activeHaunts.values())
      .filter(haunt => haunt.isActive && haunt.sessionId === sessionId);

    if (sessionHaunts.length === 0) {
      return null;
    }

    // Simple keyword-based selection (could be enhanced with NLP)
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('funny') || lowerMessage.includes('joke') || lowerMessage.includes('play')) {
      return sessionHaunts.find(h => h.personality === 'mischievous') || sessionHaunts[0];
    }
    
    if (lowerMessage.includes('sad') || lowerMessage.includes('memory') || lowerMessage.includes('past')) {
      return sessionHaunts.find(h => h.personality === 'melancholy') || sessionHaunts[0];
    }
    
    if (lowerMessage.includes('dark') || lowerMessage.includes('death') || lowerMessage.includes('future')) {
      return sessionHaunts.find(h => h.personality === 'malevolent') || sessionHaunts[0];
    }

    // Random selection with probability weighting
    const totalProbability = sessionHaunts.reduce((sum, haunt) => sum + haunt.interruptionProbability, 0);
    const random = Math.random() * totalProbability;
    
    let cumulative = 0;
    for (const haunt of sessionHaunts) {
      cumulative += haunt.interruptionProbability;
      if (random <= cumulative) {
        return haunt;
      }
    }

    return sessionHaunts[0];
  }

  /**
   * Select haunt based on emotion
   */
  private selectHauntByEmotion(sessionId: string, sentiment: string): AIHauntEntity | null {
    const sessionHaunts = Array.from(this.activeHaunts.values())
      .filter(haunt => haunt.isActive && haunt.sessionId === sessionId);

    if (sessionHaunts.length === 0) {
      return null;
    }

    // Match emotion to personality
    const emotionMapping: { [key: string]: string } = {
      'joy': 'mischievous',
      'anger': 'malevolent',
      'sadness': 'melancholy',
      'fear': 'malevolent',
      'surprise': 'mischievous',
    };

    const targetPersonality = emotionMapping[sentiment] || 'mischievous';
    return sessionHaunts.find(h => h.personality === targetPersonality) || sessionHaunts[0];
  }

  /**
   * Select welcoming haunt for new participants
   */
  private selectWelcomingHaunt(sessionId: string): AIHauntEntity | null {
    const sessionHaunts = Array.from(this.activeHaunts.values())
      .filter(haunt => haunt.isActive && haunt.sessionId === sessionId);

    // Prefer mischievous spirits for welcomes
    return sessionHaunts.find(h => h.personality === 'mischievous') || sessionHaunts[0] || null;
  }

  /**
   * Activate haunts for a session
   */
  private activateHauntsForSession(sessionId: string): void {
    // Activate 1-2 random haunts per session
    const availableHaunts = Array.from(this.activeHaunts.values()).filter(h => !h.isActive);
    const hauntCount = Math.min(2, Math.max(1, availableHaunts.length));
    
    for (let i = 0; i < hauntCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableHaunts.length);
      const haunt = availableHaunts.splice(randomIndex, 1)[0];
      
      if (haunt) {
        haunt.isActive = true;
        haunt.sessionId = sessionId;
        haunt.lastManifestation = Date.now();
        
        console.log(`👻 ${haunt.name} has joined séance ${sessionId}`);
      }
    }
  }

  /**
   * Deactivate haunts for a session
   */
  private deactivateHauntsForSession(sessionId: string): void {
    for (const haunt of this.activeHaunts.values()) {
      if (haunt.sessionId === sessionId) {
        haunt.isActive = false;
        haunt.sessionId = null;
        
        console.log(`🌫️ ${haunt.name} has left séance ${sessionId}`);
      }
    }
    
    // Clean up conversation history
    this.conversationHistory.delete(sessionId);
  }
}

// Type definitions for AI Haunt system
interface HauntPersonality {
  id: string;
  name: string;
  personality: 'mischievous' | 'melancholy' | 'malevolent';
  systemPrompt: string;
  interruptionProbability: number;
  voiceSettings: {
    speed: number;
    pitch: number;
  };
}

interface AIHauntEntity {
  id: string;
  name: string;
  personality: 'mischievous' | 'melancholy' | 'malevolent';
  systemPrompt: string;
  interruptionProbability: number;
  voiceSettings: {
    speed: number;
    pitch: number;
  };
  isActive: boolean;
  sessionId: string | null;
  lastManifestation: number;
  manifestationCount: number;
  conversationContext: ConversationMessage[];
}

interface ConversationContext {
  sessionId: string;
  messages: ConversationMessage[];
  lastUpdate: number;
}

interface ConversationMessage {
  participantId: string;
  content: string;
  timestamp: number;
}

interface HauntRequest {
  hauntId: string;
  sessionId: string;
  trigger: 'message' | 'emotion' | 'anomaly' | 'welcome' | 'request' | 'spontaneous';
  context: string;
  intensity: number;
  timestamp: number;
}