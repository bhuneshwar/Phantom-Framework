import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  IPlugin,
  IPluginLoader,
  IEventHub,
  PluginManifest,
  PluginConfig,
  SpectralError,
  SpectralErrorType,
  PluginState,
  SpectralEvent,
} from './types';
import { EventHub } from './eventHub';

/**
 * The Haunt Summoner - Dynamically loads and manages spectral plugins
 * Handles the dark arts of TypeScript module loading with retry mechanisms
 */
export class PluginLoader implements IPluginLoader {
  private loadedPlugins = new Map<string, IPlugin>();
  private pluginStates = new Map<string, PluginState>();
  private retryAttempts = new Map<string, number>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in ms

  constructor(private readonly manifestBasePath: string = process.cwd()) {}

  /**
   * Load plugin manifest from YAML file
   * Parses the ancient scrolls of plugin configuration
   */
  async loadManifest(manifestPath: string): Promise<PluginManifest> {
    try {
      const fullPath = resolve(this.manifestBasePath, manifestPath);
      const yamlContent = await readFile(fullPath, 'utf-8');
      const manifest = parseYaml(yamlContent) as PluginManifest;

      if (!manifest.plugins || !Array.isArray(manifest.plugins)) {
        throw new Error('Invalid manifest: plugins array is required');
      }

      // Validate spookiness level
      if (manifest.spookiness_level && 
          !['mild', 'moderate', 'terrifying'].includes(manifest.spookiness_level)) {
        throw new Error('Invalid spookiness level - must be mild, moderate, or terrifying');
      }

      return manifest;
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.MANIFESTATION_FAILED,
        `Failed to load manifest from ${manifestPath}: ${(error as Error).message}`,
        'PluginLoader'
      );
    }
  }

  /**
   * Load a single plugin using dynamic imports
   * Summons the plugin from the ethereal realm of TypeScript modules
   */
  async loadPlugin(pluginConfig: PluginConfig): Promise<IPlugin> {
    const { id, path, class: className } = pluginConfig;

    try {
      this.pluginStates.set(id, PluginState.AWAKENING);

      // Resolve plugin path relative to manifest
      const pluginPath = resolve(this.manifestBasePath, path);
      
      // Dynamic import with TypeScript support
      const pluginModule = await import(pluginPath);
      
      // Get the plugin class from the module
      const PluginClass = pluginModule[className] || pluginModule.default;
      
      if (!PluginClass) {
        throw new Error(`Plugin class '${className}' not found in module ${path}`);
      }

      // Instantiate the plugin
      const plugin: IPlugin = new PluginClass();

      // Validate plugin implements required interface
      this.validatePlugin(plugin, pluginConfig);

      this.loadedPlugins.set(id, plugin);
      this.pluginStates.set(id, PluginState.DORMANT);
      this.retryAttempts.delete(id); // Clear retry count on success

      return plugin;
    } catch (error) {
      this.pluginStates.set(id, PluginState.BANISHED);
      throw this.createSpectralError(
        SpectralErrorType.MANIFESTATION_FAILED,
        `Failed to load plugin '${id}': ${(error as Error).message}`,
        'PluginLoader'
      );
    }
  }

  /**
   * Initialize a loaded plugin with the EventHub
   * Awakens the plugin and connects it to the spectral nerve network
   */
  async initializePlugin(plugin: IPlugin, hub: IEventHub): Promise<void> {
    const pluginId = plugin.id;

    try {
      this.pluginStates.set(pluginId, PluginState.AWAKENING);
      
      await plugin.init(hub);
      
      this.pluginStates.set(pluginId, PluginState.ACTIVE);

      // Check for spontaneous haunting behavior
      if (plugin.haunt && Math.random() < (plugin.manifest.plugins[0]?.haunt_probability || 0)) {
        this.pluginStates.set(pluginId, PluginState.HAUNTING);
        
        // Subscribe to haunt emissions
        plugin.haunt().subscribe({
          next: (hauntEvent) => {
            hub.emit({
              ...hauntEvent,
              metadata: {
                ...hauntEvent.metadata,
                haunted: true,
                origin_realm: pluginId,
              },
            });
          },
          error: (error) => {
            console.warn(`Plugin ${pluginId} haunt failed:`, error);
            this.pluginStates.set(pluginId, PluginState.ACTIVE);
          },
        });
      }
    } catch (error) {
      this.pluginStates.set(pluginId, PluginState.BANISHED);
      throw this.createSpectralError(
        SpectralErrorType.MANIFESTATION_FAILED,
        `Failed to initialize plugin '${pluginId}': ${(error as Error).message}`,
        'PluginLoader'
      );
    }
  }

  /**
   * Teardown and remove a plugin
   * Banishes the plugin back to the void
   */
  async teardownPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    try {
      this.pluginStates.set(pluginId, PluginState.BANISHED);
      plugin.teardown();
      this.loadedPlugins.delete(pluginId);
      this.pluginStates.delete(pluginId);
      this.retryAttempts.delete(pluginId);
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.BANISHMENT_REQUIRED,
        `Failed to teardown plugin '${pluginId}': ${(error as Error).message}`,
        'PluginLoader'
      );
    }
  }

  /**
   * Retry loading a plugin with exponential backoff
   * Attempts to re-summon a failed plugin with increasing delays
   */
  async retryLoad(pluginConfig: PluginConfig, maxRetries: number = this.maxRetries): Promise<IPlugin> {
    const { id } = pluginConfig;
    const currentAttempts = this.retryAttempts.get(id) || 0;

    if (currentAttempts >= maxRetries) {
      throw this.createSpectralError(
        SpectralErrorType.MANIFESTATION_FAILED,
        `Plugin '${id}' failed to load after ${maxRetries} attempts`,
        'PluginLoader'
      );
    }

    try {
      return await this.loadPlugin(pluginConfig);
    } catch (error) {
      const newAttempts = currentAttempts + 1;
      this.retryAttempts.set(id, newAttempts);

      if (newAttempts < maxRetries) {
        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, newAttempts) + Math.random() * 1000;
        
        console.warn(`Plugin '${id}' load attempt ${newAttempts} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryLoad(pluginConfig, maxRetries);
      }

      throw error;
    }
  }

  /**
   * Get all currently loaded plugins
   */
  getLoadedPlugins(): Map<string, IPlugin> {
    return new Map(this.loadedPlugins);
  }

  /**
   * Get plugin state
   */
  getPluginState(pluginId: string): PluginState | undefined {
    return this.pluginStates.get(pluginId);
  }

  /**
   * Load all plugins from a manifest file
   * Summons an entire coven of plugins
   */
  async loadAllPlugins(manifestPath: string, hub: IEventHub): Promise<Map<string, IPlugin>> {
    const manifest = await this.loadManifest(manifestPath);
    const loadedPlugins = new Map<string, IPlugin>();

    // Emit manifest loading event
    hub.emit({
      type: 'manifest_loading',
      source: 'PluginLoader',
      timestamp: Date.now(),
      data: { 
        manifestPath, 
        pluginCount: manifest.plugins.length,
        spookiness_level: manifest.spookiness_level 
      },
      metadata: {
        haunted: manifest.spookiness_level === 'terrifying',
        intensity: this.getSpookinessIntensity(manifest.spookiness_level),
      },
    });

    for (const pluginConfig of manifest.plugins) {
      try {
        const plugin = await this.retryLoad(pluginConfig);
        await this.initializePlugin(plugin, hub);
        loadedPlugins.set(plugin.id, plugin);

        // Emit successful plugin load event
        hub.emit({
          type: 'plugin_loaded',
          source: 'PluginLoader',
          timestamp: Date.now(),
          data: { 
            pluginId: plugin.id,
            pluginPath: pluginConfig.path,
            haunt_probability: pluginConfig.haunt_probability 
          },
          metadata: {
            haunted: (pluginConfig.haunt_probability || 0) > 0.5,
            intensity: pluginConfig.haunt_probability || 0,
          },
        });
      } catch (error) {
        console.error(`Failed to load plugin '${pluginConfig.id}':`, error);
        
        // Emit plugin load failure event
        hub.emit({
          type: 'plugin_load_failed',
          source: 'PluginLoader',
          timestamp: Date.now(),
          data: { 
            pluginId: pluginConfig.id,
            error: (error as Error).message 
          },
          metadata: {
            haunted: true,
            intensity: 0.8,
          },
        });
        
        // Continue loading other plugins even if one fails
      }
    }

    // Emit coven assembly complete event
    hub.emit({
      type: 'coven_assembled',
      source: 'PluginLoader',
      timestamp: Date.now(),
      data: { 
        totalPlugins: manifest.plugins.length,
        loadedPlugins: loadedPlugins.size,
        failedPlugins: manifest.plugins.length - loadedPlugins.size 
      },
      metadata: {
        haunted: loadedPlugins.size < manifest.plugins.length,
        intensity: loadedPlugins.size / manifest.plugins.length,
      },
    });

    return loadedPlugins;
  }

  /**
   * Create event routing between plugins through EventHub
   * Establishes spectral communication channels
   */
  setupPluginEventRouting(plugins: Map<string, IPlugin>, hub: IEventHub): void {
    // Subscribe to all events and route to plugins
    hub.subscribe((event: SpectralEvent) => {
      for (const [pluginId, plugin] of plugins) {
        try {
          // Skip events from the same plugin to prevent loops
          if (event.source === pluginId) {
            continue;
          }

          // Process event through plugin
          const processed$ = plugin.process(event);
          
          // Subscribe to processed events and re-emit
          processed$.subscribe({
            next: (processedEvent) => {
              // Add routing metadata
              processedEvent.metadata = {
                ...processedEvent.metadata,
                processed_by: pluginId,
                original_source: event.source,
              };
              
              hub.emit(processedEvent);
            },
            error: (error) => {
              console.warn(`Plugin ${pluginId} processing error:`, error);
              
              // Emit processing error event
              hub.emit({
                type: 'plugin_processing_error',
                source: 'PluginLoader',
                timestamp: Date.now(),
                data: { 
                  pluginId,
                  originalEvent: event,
                  error: error.message 
                },
                metadata: {
                  haunted: true,
                  intensity: 0.6,
                },
              });
            },
          });
        } catch (error) {
          console.error(`Plugin ${pluginId} event routing error:`, error);
        }
      }
    });
  }

  /**
   * Monitor plugin health and emit disturbance events
   */
  startPluginHealthMonitoring(hub: IEventHub): void {
    setInterval(() => {
      for (const [pluginId, plugin] of this.loadedPlugins) {
        try {
          // Check for plugin disturbances
          if (plugin.manifest_disturbance && plugin.manifest_disturbance()) {
            hub.emit({
              type: 'plugin_disturbance',
              source: 'PluginLoader',
              timestamp: Date.now(),
              data: { pluginId },
              metadata: {
                haunted: true,
                intensity: 0.7,
              },
            });
          }

          // Check plugin state
          const state = this.getPluginState(pluginId);
          if (state === PluginState.BANISHED) {
            hub.emit({
              type: 'plugin_banished',
              source: 'PluginLoader',
              timestamp: Date.now(),
              data: { pluginId },
              metadata: {
                haunted: true,
                intensity: 0.9,
              },
            });
          }
        } catch (error) {
          console.error(`Health check failed for plugin ${pluginId}:`, error);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Validate that a plugin implements the required interface
   */
  private validatePlugin(plugin: any, config: PluginConfig): void {
    const requiredMethods = ['init', 'process', 'teardown'];
    const requiredProperties = ['id', 'manifest'];

    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Plugin '${config.id}' missing required method: ${method}`);
      }
    }

    for (const property of requiredProperties) {
      if (!(property in plugin)) {
        throw new Error(`Plugin '${config.id}' missing required property: ${property}`);
      }
    }

    // Validate plugin ID matches config
    if (plugin.id !== config.id) {
      throw new Error(`Plugin ID mismatch: expected '${config.id}', got '${plugin.id}'`);
    }
  }

  /**
   * Get spookiness intensity from level
   */
  private getSpookinessIntensity(level?: string): number {
    switch (level) {
      case 'mild': return 0.3;
      case 'moderate': return 0.6;
      case 'terrifying': return 1.0;
      default: return 0.5;
    }
  }

  /**
   * Create a spectral error with proper typing and metadata
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
    error.haunt_level = type === SpectralErrorType.REALM_COLLAPSE ? 1.0 : 0.5;
    error.recovery_possible = type !== SpectralErrorType.REALM_COLLAPSE;
    
    return error;
  }
}