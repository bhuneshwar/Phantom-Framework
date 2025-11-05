import {
  Subject,
  Observable,
  combineLatest,
  EMPTY,
  of,
  throwError,
  timer,
  BehaviorSubject,
} from 'rxjs';
import {
  switchMap,
  shareReplay,
  catchError,
  retryWhen,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  tap,
  take,
  delay,
} from 'rxjs/operators';
import {
  IEventHub,
  SpectralEvent,
  StreamState,
  SpectralError,
  SpectralErrorType,
} from './types';

/**
 * The Spectral Nerve System - Central reactive event orchestration
 * Manages all haunted streams and ethereal state throughout the framework
 */
export class EventHub extends Subject<SpectralEvent> implements IEventHub {
  private readonly spectralState = new Map<string, BehaviorSubject<any>>();
  private readonly streamStates = new Map<string, StreamState>();
  private readonly hauntedStreams = new Set<string>();
  private readonly cursedKeys = new Set<string>();
  
  // Spooky metrics
  private eventCount = 0;
  private hauntLevel = 0;
  private lastDisturbance = 0;

  constructor() {
    super();
    this.initializeSpectralMonitoring();
  }

  /**
   * Process a stream through transformation functions with spectral error handling
   * Applies switchMap, shareReplay, catchError, and retryWhen for resilient stream processing
   */
  processStream<T, R>(
    input$: Observable<T>,
    fn: (data: T) => Observable<R>
  ): Observable<R> {
    const streamId = this.generateStreamId();
    
    return input$.pipe(
      // Log stream entry for debugging
      tap(() => this.logSpectralActivity('stream_entry', streamId)),
      
      // Transform data through the provided function
      switchMap((data: T) => {
        try {
          return fn(data).pipe(
            // Handle individual transformation errors
            catchError((error: Error) => {
              this.handleStreamDisturbance(error, streamId);
              return EMPTY; // Continue stream without emitting
            })
          );
        } catch (syncError) {
          this.handleStreamDisturbance(syncError, streamId);
          return EMPTY;
        }
      }),
      
      // Share replay for multiple subscribers (spectral efficiency)
      shareReplay({ bufferSize: 1, refCount: true }),
      
      // Global error handling with spooky retry logic
      catchError((error: Error) => {
        this.manifestGhostlyCrash(error, streamId);
        return throwError(() => this.createSpectralError(
          SpectralErrorType.DISTURBANCE_DETECTED,
          `Stream ${streamId} encountered spectral disturbance: ${error.message}`,
          'EventHub'
        ));
      }),
      
      // Retry with exponential backoff and haunt probability
      retryWhen((errors$) =>
        errors$.pipe(
          tap((error) => {
            this.increaseHauntLevel();
            console.warn(`Spectral disturbance in stream ${streamId}:`, error);
          }),
          switchMap((error, index) => {
            // Maximum 3 retry attempts
            if (index >= 3) {
              return throwError(() => error);
            }
            
            // Exponential backoff with spooky jitter
            const delay = Math.pow(2, index) * 1000 + Math.random() * 1000;
            return timer(delay);
          }),
          take(3)
        )
      ),
      
      // Log successful stream completion
      tap(() => this.logSpectralActivity('stream_success', streamId))
    );
  }

  /**
   * Fuse multiple streams into a combined observable using combineLatest
   * Creates spectral harmony between multiple haunted data sources
   */
  fuseStreams<T>(...streams: Observable<T>[]): Observable<T[]> {
    if (streams.length === 0) {
      return of([]);
    }

    const fusionId = this.generateStreamId('fusion');
    
    return combineLatest(streams).pipe(
      // Debounce rapid changes to prevent spectral overload
      debounceTime(10),
      
      // Only emit when values actually change
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      ),
      
      // Log fusion activity
      tap((values) => {
        this.logSpectralActivity('stream_fusion', fusionId, { 
          streamCount: streams.length,
          valueCount: values.length 
        });
      }),
      
      // Handle fusion errors
      catchError((error: Error) => {
        this.manifestGhostlyCrash(error, fusionId);
        return of([] as T[]); // Return empty array on error
      }),
      
      // Share the fused stream
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Select reactive state by key with spectral caching
   * Returns an observable that emits when the specified state changes
   */
  select<T>(key: string): Observable<T> {
    if (!this.spectralState.has(key)) {
      // Create new BehaviorSubject for this key
      this.spectralState.set(key, new BehaviorSubject<T | undefined>(undefined));
      this.updateStreamState(key, undefined, 0);
    }

    const subject = this.spectralState.get(key)!;
    
    return subject.asObservable().pipe(
      // Filter out undefined values unless explicitly set
      filter((value): value is T => value !== undefined),
      
      // Track subscribers for metrics
      tap(() => this.incrementSubscriberCount(key)),
      
      // Handle cursed keys with special behavior
      switchMap((value) => {
        if (this.cursedKeys.has(key)) {
          // Add spooky delay for cursed keys
          return of(value).pipe(delay(Math.random() * 100));
        }
        return of(value);
      }),
      
      // Share among multiple subscribers
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Get current state value without subscribing
   */
  getState<T>(key: string): T | undefined {
    const subject = this.spectralState.get(key);
    return subject?.getValue() as T | undefined;
  }

  /**
   * Set state value and notify all spectral subscribers
   */
  setState<T>(key: string, value: T): void {
    if (!this.spectralState.has(key)) {
      this.spectralState.set(key, new BehaviorSubject<T>(value));
    } else {
      this.spectralState.get(key)!.next(value);
    }

    this.updateStreamState(key, value, this.getSubscriberCount(key));
    
    // Emit state change event
    this.emit({
      type: 'state_changed',
      source: 'EventHub',
      timestamp: Date.now(),
      data: { key, value },
      metadata: {
        haunted: this.cursedKeys.has(key),
        spectral_signature: this.generateSpectralSignature(key, value),
      },
    });
  }

  /**
   * Emit an event to all spectral subscribers
   */
  emit(event: SpectralEvent): void {
    this.eventCount++;
    
    // Add framework metadata if not present
    if (!event.metadata) {
      event.metadata = {};
    }
    
    event.metadata.spectral_signature = this.generateSpectralSignature(
      event.type,
      event.data
    );
    
    // Check for haunt probability
    if (Math.random() < this.calculateHauntProbability()) {
      event.metadata.haunted = true;
      event.metadata.intensity = this.hauntLevel;
      this.increaseHauntLevel();
    }

    // Emit to all subscribers
    this.next(event);
  }

  /**
   * Subscribe to spectral events with enhanced error handling
   */
  subscribe(observer: (event: SpectralEvent) => void): void {
    super.subscribe({
      next: (event) => {
        try {
          observer(event);
        } catch (error) {
          this.handleSubscriberError(error as Error, event);
        }
      },
      error: (error) => {
        this.manifestGhostlyCrash(error, 'subscription');
      },
    });
  }

  /**
   * Curse a state key to add unpredictable behavior
   */
  curseKey(key: string): void {
    this.cursedKeys.add(key);
    this.logSpectralActivity('key_cursed', key);
  }

  /**
   * Remove curse from a state key
   */
  uncurseKey(key: string): void {
    this.cursedKeys.delete(key);
    this.logSpectralActivity('key_uncursed', key);
  }

  /**
   * Get spectral metrics for monitoring
   */
  getSpectralMetrics(): {
    eventCount: number;
    hauntLevel: number;
    activeStreams: number;
    cursedKeys: number;
    lastDisturbance: number;
  } {
    return {
      eventCount: this.eventCount,
      hauntLevel: this.hauntLevel,
      activeStreams: this.spectralState.size,
      cursedKeys: this.cursedKeys.size,
      lastDisturbance: this.lastDisturbance,
    };
  }

  /**
   * Initialize spectral monitoring and cleanup
   */
  private initializeSpectralMonitoring(): void {
    // Periodic haunt level decay
    setInterval(() => {
      this.hauntLevel = Math.max(0, this.hauntLevel * 0.95);
    }, 5000);

    // Cleanup old stream states
    setInterval(() => {
      const now = Date.now();
      for (const [key, state] of this.streamStates) {
        if (now - state.lastUpdated > 300000) { // 5 minutes
          this.streamStates.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Generate unique stream identifier
   */
  private generateStreamId(prefix: string = 'stream'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle stream disturbances with logging
   */
  private handleStreamDisturbance(error: Error, streamId: string): void {
    this.lastDisturbance = Date.now();
    this.hauntedStreams.add(streamId);
    
    console.warn(`Spectral disturbance in stream ${streamId}:`, error.message);
    
    this.emit({
      type: 'spectral_disturbance',
      source: 'EventHub',
      timestamp: Date.now(),
      data: { streamId, error: error.message },
      metadata: {
        haunted: true,
        intensity: 0.7,
      },
    });
  }

  /**
   * Manifest a ghostly crash event
   */
  private manifestGhostlyCrash(error: Error, context: string): void {
    this.lastDisturbance = Date.now();
    this.hauntLevel = Math.min(1.0, this.hauntLevel + 0.3);
    
    console.error(`Ghostly crash in ${context}:`, error);
    
    this.emit({
      type: 'ghostly_crash',
      source: 'EventHub',
      timestamp: Date.now(),
      data: { context, error: error.message, stack: error.stack },
      metadata: {
        haunted: true,
        intensity: 1.0,
        curse_level: this.hauntLevel,
      },
    });
  }

  /**
   * Handle subscriber errors gracefully
   */
  private handleSubscriberError(error: Error, event: SpectralEvent): void {
    console.error('Subscriber error:', error);
    
    this.emit({
      type: 'subscriber_error',
      source: 'EventHub',
      timestamp: Date.now(),
      data: { originalEvent: event, error: error.message },
      metadata: {
        haunted: true,
        intensity: 0.5,
      },
    });
  }

  /**
   * Update stream state tracking
   */
  private updateStreamState<T>(key: string, value: T, subscribers: number): void {
    this.streamStates.set(key, {
      key,
      value,
      lastUpdated: Date.now(),
      subscribers,
      is_cursed: this.cursedKeys.has(key),
      haunt_count: this.hauntedStreams.size,
    });
  }

  /**
   * Get subscriber count for a key
   */
  private getSubscriberCount(key: string): number {
    const state = this.streamStates.get(key);
    return state?.subscribers || 0;
  }

  /**
   * Increment subscriber count
   */
  private incrementSubscriberCount(key: string): void {
    const state = this.streamStates.get(key);
    if (state) {
      state.subscribers++;
    }
  }

  /**
   * Calculate haunt probability based on current state
   */
  private calculateHauntProbability(): number {
    const baseProb = 0.05; // 5% base haunt chance
    const hauntBonus = this.hauntLevel * 0.2;
    const disturbanceBonus = this.hauntedStreams.size * 0.01;
    
    return Math.min(0.5, baseProb + hauntBonus + disturbanceBonus);
  }

  /**
   * Increase haunt level with decay
   */
  private increaseHauntLevel(): void {
    this.hauntLevel = Math.min(1.0, this.hauntLevel + 0.1);
  }

  /**
   * Generate spectral signature for events
   */
  private generateSpectralSignature(type: string, data: any): string {
    const hash = this.simpleHash(JSON.stringify({ type, data }));
    return `spectral_${hash.toString(16)}`;
  }

  /**
   * Simple hash function for spectral signatures
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Log spectral activity for debugging
   */
  private logSpectralActivity(activity: string, context: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`👻 Spectral Activity: ${activity} in ${context}`, data || '');
    }
  }

  /**
   * Create async iterator for non-blocking stream consumption
   * Allows for-await-of loops over spectral events
   */
  async *spectralIterator(
    filter?: (event: SpectralEvent) => boolean,
    maxEvents?: number
  ): AsyncIterableIterator<SpectralEvent> {
    let eventCount = 0;
    const eventQueue: SpectralEvent[] = [];
    let resolveNext: ((value: IteratorResult<SpectralEvent>) => void) | null = null;
    let isComplete = false;

    // Subscribe to events
    const subscription = this.subscribe((event) => {
      // Apply filter if provided
      if (filter && !filter(event)) {
        return;
      }

      eventCount++;
      
      if (resolveNext) {
        // Immediately resolve pending iterator
        resolveNext({ value: event, done: false });
        resolveNext = null;
      } else {
        // Queue event for later consumption
        eventQueue.push(event);
      }

      // Check if we've reached max events
      if (maxEvents && eventCount >= maxEvents) {
        isComplete = true;
        if (resolveNext) {
          resolveNext({ value: undefined, done: true });
          resolveNext = null;
        }
      }
    });

    try {
      while (!isComplete) {
        if (eventQueue.length > 0) {
          // Return queued event
          yield eventQueue.shift()!;
        } else {
          // Wait for next event
          const result = await new Promise<IteratorResult<SpectralEvent>>((resolve) => {
            resolveNext = resolve;
            
            // Add timeout to prevent infinite waiting
            setTimeout(() => {
              if (resolveNext === resolve) {
                resolveNext = null;
                resolve({ value: undefined, done: true });
              }
            }, 30000); // 30 second timeout
          });

          if (result.done) {
            break;
          }

          yield result.value;
        }
      }
    } finally {
      // Cleanup subscription
      subscription?.unsubscribe?.();
    }
  }

  /**
   * Create async iterator for state changes
   * Monitors specific state key changes asynchronously
   */
  async *stateIterator<T>(
    key: string,
    maxChanges?: number
  ): AsyncIterableIterator<T> {
    let changeCount = 0;
    const valueQueue: T[] = [];
    let resolveNext: ((value: IteratorResult<T>) => void) | null = null;
    let isComplete = false;

    // Subscribe to state changes
    const subscription = this.select<T>(key).subscribe({
      next: (value) => {
        changeCount++;
        
        if (resolveNext) {
          resolveNext({ value, done: false });
          resolveNext = null;
        } else {
          valueQueue.push(value);
        }

        if (maxChanges && changeCount >= maxChanges) {
          isComplete = true;
          if (resolveNext) {
            resolveNext({ value: undefined, done: true });
            resolveNext = null;
          }
        }
      },
      error: (error) => {
        console.error(`State iterator error for key ${key}:`, error);
        isComplete = true;
        if (resolveNext) {
          resolveNext({ value: undefined, done: true });
          resolveNext = null;
        }
      },
    });

    try {
      while (!isComplete) {
        if (valueQueue.length > 0) {
          yield valueQueue.shift()!;
        } else {
          const result = await new Promise<IteratorResult<T>>((resolve) => {
            resolveNext = resolve;
            
            setTimeout(() => {
              if (resolveNext === resolve) {
                resolveNext = null;
                resolve({ value: undefined, done: true });
              }
            }, 30000);
          });

          if (result.done) {
            break;
          }

          yield result.value;
        }
      }
    } finally {
      subscription?.unsubscribe?.();
    }
  }

  /**
   * Create backpressure-aware stream processor
   * Handles high-volume streams without overwhelming subscribers
   */
  createBackpressureStream<T>(
    source$: Observable<T>,
    bufferSize: number = 100,
    dropStrategy: 'oldest' | 'newest' | 'error' = 'oldest'
  ): Observable<T> {
    const buffer: T[] = [];
    let isProcessing = false;

    return new Observable<T>((subscriber) => {
      const subscription = source$.subscribe({
        next: (value) => {
          // Handle buffer overflow
          if (buffer.length >= bufferSize) {
            switch (dropStrategy) {
              case 'oldest':
                buffer.shift(); // Remove oldest
                break;
              case 'newest':
                return; // Drop current value
              case 'error':
                subscriber.error(new Error('Buffer overflow - backpressure limit exceeded'));
                return;
            }
          }

          buffer.push(value);
          
          // Process buffer if not already processing
          if (!isProcessing) {
            this.processBuffer(buffer, subscriber);
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => {
          // Process remaining buffer items
          this.processBuffer(buffer, subscriber, true);
        },
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Process buffered items with async iteration
   */
  private async processBuffer<T>(
    buffer: T[],
    subscriber: any,
    isComplete: boolean = false
  ): Promise<void> {
    while (buffer.length > 0) {
      const item = buffer.shift()!;
      
      try {
        subscriber.next(item);
        
        // Add small delay to prevent overwhelming
        await new Promise(resolve => setImmediate(resolve));
      } catch (error) {
        subscriber.error(error);
        return;
      }
    }

    if (isComplete) {
      subscriber.complete();
    }
  }

  /**
   * Create spectral error with proper typing
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