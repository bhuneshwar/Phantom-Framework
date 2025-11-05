import { Observable, of, timer, EMPTY } from 'rxjs';
import { map, delay, switchMap, tap } from 'rxjs/operators';
import {
  IPlugin,
  IEventHub,
  SpectralEvent,
  PluginManifest,
  PluginState,
} from '../core/types';

/**
 * Echo Haunt - A sample plugin that demonstrates spectral event processing
 * Echoes incoming events with spooky modifications and occasional haunting behavior
 */
export class EchoPlugin implements IPlugin {
  readonly id = 'echo_haunt';
  readonly manifest: PluginManifest = {
    plugins: [{
      id: 'echo_haunt',
      path: './plugins/echo.ts',
      class: 'EchoPlugin',
      haunt_probability: 0.2, // 20% chance of haunting
    }],
    version: '1.0.0',
    author: 'Phantom Framework',
    description: 'A spectral echo that repeats your words with ghostly whispers',
    spookiness_level: 'moderate',
  };

  private hub?: IEventHub;
  private echoCount = 0;
  private lastEcho = 0;
  private isHaunting = false;
  private hauntingIntensity = 0;

  /**
   * Initialize the echo haunt with spectral nerve access
   */
  async init(hub: IEventHub): Promise<void> {
    this.hub = hub;
    
    console.log('👻 Echo Haunt awakening from the digital void...');
    
    // Set initial state
    hub.setState('echo_plugin_state', PluginState.ACTIVE);
    hub.setState('echo_count', 0);
    
    // Start periodic haunting check
    this.startHauntingBehavior();
    
    // Emit initialization event
    hub.emit({
      type: 'plugin_initialized',
      source: this.id,
      timestamp: Date.now(),
      data: { message: 'Echo Haunt is ready to whisper back your words...' },
      metadata: {
        haunted: true,
        intensity: 0.3,
        spectral_signature: 'echo_awakening',
      },
    });
  }

  /**
   * Process incoming spectral events with echo behavior
   */
  process(event: SpectralEvent): Observable<SpectralEvent> {
    // Ignore our own events to prevent infinite loops
    if (event.source === this.id) {
      return EMPTY;
    }

    // Only process certain event types
    const processableTypes = [
      'user_message',
      'test_event',
      'spectral_whisper',
      'plugin_test',
    ];

    if (!processableTypes.includes(event.type)) {
      return EMPTY;
    }

    this.echoCount++;
    this.lastEcho = Date.now();
    
    // Update state
    if (this.hub) {
      this.hub.setState('echo_count', this.echoCount);
    }

    // Create echo with spooky modifications
    const echoEvent: SpectralEvent = {
      type: 'spectral_echo',
      source: this.id,
      timestamp: Date.now(),
      data: {
        original: event.data,
        echo: this.createSpookyEcho(event.data),
        echo_number: this.echoCount,
        haunting: this.isHaunting,
      },
      metadata: {
        haunted: true,
        intensity: this.calculateEchoIntensity(),
        origin_realm: event.source,
        spectral_signature: `echo_${this.echoCount}`,
        curse_level: this.hauntingIntensity,
      },
    };

    // Add delay for spooky effect
    const baseDelay = this.isHaunting ? 500 : 100;
    const randomDelay = Math.random() * 200;

    return of(echoEvent).pipe(
      delay(baseDelay + randomDelay),
      tap(() => {
        console.log(`👻 Echo Haunt whispers: "${echoEvent.data.echo}"`);
      })
    );
  }

  /**
   * Manifest spontaneous haunting behavior
   */
  haunt(): Observable<SpectralEvent> {
    if (!this.isHaunting) {
      return EMPTY;
    }

    // Create random haunting events
    const hauntMessages = [
      'The echoes remember everything...',
      'Your words linger in the digital ether...',
      'Something stirs in the spectral realm...',
      'The void whispers back...',
      'Ancient data fragments dance in the shadows...',
    ];

    return timer(0, 5000 + Math.random() * 10000).pipe(
      switchMap(() => {
        if (!this.isHaunting || Math.random() > 0.3) {
          return EMPTY;
        }

        const hauntEvent: SpectralEvent = {
          type: 'spontaneous_haunt',
          source: this.id,
          timestamp: Date.now(),
          data: {
            message: hauntMessages[Math.floor(Math.random() * hauntMessages.length)],
            intensity: this.hauntingIntensity,
            echo_count: this.echoCount,
          },
          metadata: {
            haunted: true,
            intensity: this.hauntingIntensity,
            spectral_signature: 'spontaneous_echo_haunt',
          },
        };

        return of(hauntEvent);
      })
    );
  }

  /**
   * Check for supernatural disturbances
   */
  manifest_disturbance(): boolean {
    // Consider it a disturbance if we haven't echoed in a while but should be active
    const timeSinceLastEcho = Date.now() - this.lastEcho;
    const isStagnant = timeSinceLastEcho > 60000 && this.echoCount > 0; // 1 minute
    
    // Or if haunting intensity is too high
    const isOverHaunted = this.hauntingIntensity > 0.8;
    
    return isStagnant || isOverHaunted;
  }

  /**
   * Clean up spectral resources
   */
  teardown(): void {
    console.log('👻 Echo Haunt fading back into the digital void...');
    
    this.isHaunting = false;
    this.hauntingIntensity = 0;
    
    if (this.hub) {
      this.hub.setState('echo_plugin_state', PluginState.BANISHED);
      
      // Emit farewell event
      this.hub.emit({
        type: 'plugin_teardown',
        source: this.id,
        timestamp: Date.now(),
        data: { 
          message: 'Echo Haunt returns to the void...',
          final_echo_count: this.echoCount 
        },
        metadata: {
          haunted: true,
          intensity: 0.1,
          spectral_signature: 'echo_farewell',
        },
      });
    }
  }

  /**
   * Create spooky echo of the original data
   */
  private createSpookyEcho(originalData: any): string {
    let echo: string;
    
    if (typeof originalData === 'string') {
      echo = originalData;
    } else if (originalData && typeof originalData === 'object') {
      echo = originalData.message || originalData.text || JSON.stringify(originalData);
    } else {
      echo = String(originalData);
    }

    // Apply spooky transformations
    const transformations = [
      (text: string) => `*whispers* ${text} *whispers*`,
      (text: string) => `${text}... ${text}... ${text}...`,
      (text: string) => text.split('').join(' ').toLowerCase(),
      (text: string) => `~~~ ${text} ~~~`,
      (text: string) => `${text} (echoes from beyond)`,
    ];

    // Apply random transformation based on haunting state
    if (this.isHaunting) {
      const transform = transformations[Math.floor(Math.random() * transformations.length)];
      echo = transform(echo);
    } else {
      echo = `*echo* ${echo}`;
    }

    return echo;
  }

  /**
   * Calculate echo intensity based on current state
   */
  private calculateEchoIntensity(): number {
    const baseIntensity = 0.3;
    const hauntBonus = this.isHaunting ? 0.4 : 0;
    const frequencyBonus = Math.min(0.3, this.echoCount * 0.01);
    
    return Math.min(1.0, baseIntensity + hauntBonus + frequencyBonus);
  }

  /**
   * Start periodic haunting behavior
   */
  private startHauntingBehavior(): void {
    setInterval(() => {
      // Random chance to start/stop haunting
      if (!this.isHaunting && Math.random() < 0.1) { // 10% chance to start haunting
        this.isHaunting = true;
        this.hauntingIntensity = 0.3 + Math.random() * 0.4;
        
        console.log('👻 Echo Haunt begins to manifest more intensely...');
        
        if (this.hub) {
          this.hub.emit({
            type: 'haunting_intensified',
            source: this.id,
            timestamp: Date.now(),
            data: { intensity: this.hauntingIntensity },
            metadata: {
              haunted: true,
              intensity: this.hauntingIntensity,
            },
          });
        }
      } else if (this.isHaunting && Math.random() < 0.2) { // 20% chance to stop haunting
        this.isHaunting = false;
        this.hauntingIntensity = 0;
        
        console.log('👻 Echo Haunt calms down...');
      }
      
      // Gradually decay haunting intensity
      if (this.isHaunting) {
        this.hauntingIntensity *= 0.95;
        if (this.hauntingIntensity < 0.1) {
          this.isHaunting = false;
          this.hauntingIntensity = 0;
        }
      }
    }, 10000); // Check every 10 seconds
  }
}