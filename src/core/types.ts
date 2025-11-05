import { Observable } from 'rxjs';

/**
 * Core plugin interface that all haunt packs must implement
 * Provides lifecycle management and event processing capabilities
 */
export interface IPlugin {
  readonly id: string;
  readonly manifest: PluginManifest;

  /**
   * Initialize the plugin with access to the spectral nerve system
   */
  init(hub: IEventHub): Promise<void>;

  /**
   * Process incoming events through the plugin's haunted logic
   */
  process(event: SpectralEvent): Observable<SpectralEvent>;

  /**
   * Clean up resources when the plugin is banished
   */
  teardown(): void;

  /**
   * Optional: Manifest unpredictable spooky behaviors
   */
  haunt?(): Observable<SpectralEvent>;

  /**
   * Optional: Check if the plugin is experiencing supernatural disturbances
   */
  manifest_disturbance?(): boolean;
}

/**
 * Central event hub interface for spectral nerve orchestration
 */
export interface IEventHub {
  /**
   * Process a stream through transformation functions with error handling
   */
  processStream<T, R>(
    input$: Observable<T>,
    fn: (data: T) => Observable<R>
  ): Observable<R>;

  /**
   * Fuse multiple streams into a combined observable
   */
  fuseStreams<T>(...streams: Observable<T>[]): Observable<T[]>;

  /**
   * Select reactive state by key
   */
  select<T>(key: string): Observable<T>;

  /**
   * Get current state value
   */
  getState<T>(key: string): T | undefined;

  /**
   * Set state value and notify subscribers
   */
  setState<T>(key: string, value: T): void;

  /**
   * Emit an event to all subscribers
   */
  emit(event: SpectralEvent): void;

  /**
   * Subscribe to events
   */
  subscribe(observer: (event: SpectralEvent) => void): void;
}

/**
 * Plugin manifest configuration
 */
export interface PluginManifest {
  plugins: PluginConfig[];
  version: string;
  author?: string;
  description?: string;
  spookiness_level?: 'mild' | 'moderate' | 'terrifying';
}

/**
 * Individual plugin configuration
 */
export interface PluginConfig {
  id: string;
  path: string;
  class: string;
  dependencies?: string[];
  permissions?: Permission[];
  haunt_probability?: number; // 0-1 for unpredictable behaviors
  containment_level?: 'sandbox' | 'isolated' | 'trusted';
}

/**
 * Plugin permissions for security containment
 */
export enum Permission {
  NETWORK_ACCESS = 'network_access',
  FILE_SYSTEM = 'file_system',
  PROCESS_SPAWN = 'process_spawn',
  SPECTRAL_WRITE = 'spectral_write',
  HAUNT_OTHERS = 'haunt_others',
}

/**
 * Standardized event structure for spectral communication
 */
export interface SpectralEvent {
  type: string;
  timestamp: number;
  source: string;
  data: any;
  metadata?: {
    haunted?: boolean;
    intensity?: number; // 0-1 scale
    origin_realm?: string;
    curse_level?: number;
    spectral_signature?: string;
  };
}

/**
 * Stream state management
 */
export interface StreamState<T = any> {
  key: string;
  value: T;
  lastUpdated: number;
  subscribers: number;
  is_cursed?: boolean;
  haunt_count?: number;
}

/**
 * Error types for supernatural disturbances
 */
export enum SpectralErrorType {
  MANIFESTATION_FAILED = 'manifestation_failed',
  DISTURBANCE_DETECTED = 'disturbance_detected',
  BANISHMENT_REQUIRED = 'banishment_required',
  REALM_COLLAPSE = 'realm_collapse',
  GHOSTLY_CRASH = 'ghostly_crash',
}

/**
 * Error information for spectral disturbances
 */
export interface SpectralError extends Error {
  type: SpectralErrorType;
  source: string;
  timestamp: number;
  haunt_level: number;
  recovery_possible: boolean;
}

/**
 * Plugin loader interface
 */
export interface IPluginLoader {
  loadManifest(manifestPath: string): Promise<PluginManifest>;
  loadPlugin(pluginConfig: PluginConfig): Promise<IPlugin>;
  initializePlugin(plugin: IPlugin, hub: IEventHub): Promise<void>;
  teardownPlugin(pluginId: string): Promise<void>;
  retryLoad(pluginConfig: PluginConfig, maxRetries: number): Promise<IPlugin>;
  getLoadedPlugins(): Map<string, IPlugin>;
}

/**
 * Web Worker sandbox interface for plugin isolation
 */
export interface IWorkerSandbox {
  execute<T, R>(code: string, data: T): Promise<R>;
  terminate(): void;
  isAlive(): boolean;
}

/**
 * Spooky utility types
 */
export type HauntedCallback<T> = (data: T, haunt_level: number) => void;
export type SpectralTransform<T, R> = (input: T) => Observable<R>;
export type CurseFunction<T> = (data: T) => T;

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  DORMANT = 'dormant',
  AWAKENING = 'awakening',
  ACTIVE = 'active',
  HAUNTING = 'haunting',
  BANISHED = 'banished',
  EXORCISED = 'exorcised',
}