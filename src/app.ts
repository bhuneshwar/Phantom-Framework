import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cluster from 'cluster';

// Phantom Framework imports
import { EventHub } from './core/eventHub';
import { PluginLoader } from './core/loader';
import { AuthService, authenticateSpirit, requireRole, Role } from './security/auth';
import { createRateLimitMiddleware, createUserRateLimitMiddleware } from './security/rateLimit';
import { ClusterManager } from './scaling/cluster';
import { RedisBridge } from './scaling/redisBridge';
import { SpectralEvent } from './core/types';

/**
 * Phantom Framework Express Application
 * The main spectral server that orchestrates the haunted realm
 */

class PhantomApp {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private eventHub: EventHub;
  private pluginLoader: PluginLoader;
  private authService: AuthService;
  private redisBridge: RedisBridge;
  private clusterManager?: ClusterManager;
  
  private readonly port: number;
  private readonly isProduction: boolean;
  private readonly enableClustering: boolean;

  constructor() {
    this.port = parseInt(process.env.PORT || '3000');
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableClustering = process.env.SPECTRAL_MODE === 'coven';
    
    this.app = express();
    this.eventHub = new EventHub();
    this.pluginLoader = new PluginLoader();
    this.authService = new AuthService({
      jwtSecret: process.env.JWT_SECRET || 'spectral-secret-key',
      jwtExpiry: '1h',
      refreshSecret: process.env.REFRESH_SECRET || 'ethereal-refresh-key',
      refreshExpiry: '7d',
      allowHauntedTokens: !this.isProduction,
    });
    this.redisBridge = new RedisBridge();
    
    this.initializeApp();
  }

  /**
   * Initialize the spectral application
   */
  private async initializeApp(): Promise<void> {
    console.log('🌟 Initializing Phantom Framework...');
    
    // Set up clustering if enabled
    if (this.enableClustering && cluster.isMaster) {
      await this.initializeCluster();
      return;
    }
    
    // Worker process or single instance setup
    await this.setupMiddleware();
    await this.setupRoutes();
    await this.setupSocketIO();
    await this.connectServices();
    await this.loadPlugins();
    
    console.log('👻 Phantom Framework initialized successfully');
  }

  /**
   * Initialize cluster management
   */
  private async initializeCluster(): Promise<void> {
    this.clusterManager = new ClusterManager({
      instances: 'max',
      maxMemoryRestart: '500M',
      hauntedWorkerThreshold: 0.8,
    });

    // Set up cluster event handlers
    this.clusterManager.on('cluster_started', (data) => {
      console.log(`🕸️ Spectral coven assembled with ${data.workerCount} workers`);
    });

    this.clusterManager.on('worker_haunted', (data) => {
      console.warn(`👻 Worker ${data.workerId} has become haunted`);
    });

    await this.clusterManager.startCluster();
  }

  /**
   * Set up Express middleware
   */
  private async setupMiddleware(): Promise<void> {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.isProduction 
        ? ['https://phantom-framework.com', 'https://api.phantom-framework.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Spectral-Token'],
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use('/api', createRateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      allowHauntedBypass: true,
    }));

    // Request logging with spectral flair
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const isHaunted = duration > 1000 || res.statusCode >= 400;
        
        console.log(`${isHaunted ? '👻' : '✨'} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        // Emit request event to EventHub
        this.eventHub.emit({
          type: 'http_request',
          source: 'PhantomApp',
          timestamp: Date.now(),
          data: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
          },
          metadata: {
            haunted: isHaunted,
            intensity: isHaunted ? Math.min(1.0, duration / 5000) : 0.1,
          },
        });
      });
      
      next();
    });

    // Error handling middleware
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('💀 Spectral error occurred:', error);
      
      // Emit error event
      this.eventHub.emit({
        type: 'ghostly_crash',
        source: 'PhantomApp',
        timestamp: Date.now(),
        data: {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
        },
        metadata: {
          haunted: true,
          intensity: 0.8,
        },
      });

      res.status(500).json({
        error: 'A spectral disturbance has occurred',
        message: this.isProduction ? 'Internal server error' : error.message,
        haunted: true,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Set up API routes
   */
  private async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      const status = {
        status: 'alive',
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        spectralMetrics: this.eventHub.getSpectralMetrics(),
        haunted: false,
      };

      res.json(status);
    });

    // Spectral status endpoint
    this.app.get('/api/spectral/status', (req: Request, res: Response) => {
      const metrics = this.eventHub.getSpectralMetrics();
      const redisBridgeStatus = this.redisBridge.getStatus();
      
      res.json({
        eventHub: metrics,
        redisBridge: redisBridgeStatus,
        plugins: Array.from(this.pluginLoader.getLoadedPlugins().keys()),
        cluster: this.clusterManager?.getClusterStatus(),
        haunted: metrics.hauntLevel > 0.5,
      });
    });

    // Authentication routes
    this.app.post('/api/auth/login', async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;
        
        // Mock authentication - replace with real auth logic
        if (username && password) {
          const user = {
            id: `user_${Date.now()}`,
            username,
            role: Role.USER,
            permissions: ['read', 'write'],
            spectral_level: 0.5,
            haunted: Math.random() < 0.1, // 10% chance of haunted users
          };
          
          const token = this.authService.generateToken(user);
          const refreshToken = this.authService.generateRefreshToken(user.id);
          
          res.json({
            token,
            refreshToken,
            user,
            message: 'Welcome to the spectral realm',
            haunted: user.haunted,
          });
        } else {
          res.status(401).json({
            error: 'Invalid credentials',
            message: 'The spirits reject your offering',
            haunted: true,
          });
        }
      } catch (error) {
        res.status(500).json({
          error: 'Authentication failed',
          message: 'A disturbance in the authentication realm',
          haunted: true,
        });
      }
    });

    // Protected routes
    this.app.use('/api/protected', authenticateSpirit(this.authService));
    
    this.app.get('/api/protected/profile', (req: Request, res: Response) => {
      const user = (req as any).user;
      res.json({
        user,
        spectralLevel: (req as any).spectralLevel,
        isHaunted: (req as any).isHaunted,
        message: 'Your spectral essence has been revealed',
      });
    });

    // Admin routes
    this.app.use('/api/admin', 
      authenticateSpirit(this.authService),
      requireRole(this.authService, Role.ADMIN)
    );
    
    this.app.get('/api/admin/plugins', (req: Request, res: Response) => {
      const plugins = Array.from(this.pluginLoader.getLoadedPlugins().entries()).map(([id, plugin]) => ({
        id,
        manifest: plugin.manifest,
        state: this.pluginLoader.getPluginState(id),
      }));
      
      res.json({ plugins });
    });

    // Event streaming endpoint
    this.app.get('/api/events/stream', (req: Request, res: Response) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const subscription = this.eventHub.subscribe((event: SpectralEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      req.on('close', () => {
        subscription?.unsubscribe?.();
      });
    });

    // Test endpoint for triggering events
    this.app.post('/api/test/event', (req: Request, res: Response) => {
      const { type, data } = req.body;
      
      this.eventHub.emit({
        type: type || 'test_event',
        source: 'TestEndpoint',
        timestamp: Date.now(),
        data: data || { message: 'Test event from API' },
        metadata: {
          haunted: Math.random() < 0.3,
          intensity: Math.random(),
        },
      });

      res.json({
        message: 'Event emitted to the spectral realm',
        haunted: true,
      });
    });

    // 404 handler with spooky message
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Path not found in the spectral realm',
        message: 'The spirits cannot locate this ethereal destination',
        path: req.originalUrl,
        haunted: true,
        suggestions: ['/health', '/api/spectral/status', '/api/auth/login'],
      });
    });
  }

  /**
   * Set up Socket.IO for real-time communication
   */
  private async setupSocketIO(): Promise<void> {
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      console.log(`👻 Spirit connected: ${socket.id}`);
      
      // Subscribe to spectral events
      const subscription = this.eventHub.subscribe((event: SpectralEvent) => {
        socket.emit('spectral_event', event);
      });

      // Handle client events
      socket.on('join_seance', (data) => {
        socket.join('seance_room');
        socket.emit('seance_joined', { 
          message: 'You have joined the spectral séance',
          haunted: true 
        });
      });

      socket.on('spectral_message', (data) => {
        this.eventHub.emit({
          type: 'user_message',
          source: socket.id,
          timestamp: Date.now(),
          data,
          metadata: {
            haunted: Math.random() < 0.2,
            intensity: Math.random() * 0.5,
          },
        });
      });

      socket.on('disconnect', () => {
        console.log(`🌫️ Spirit departed: ${socket.id}`);
        subscription?.unsubscribe?.();
      });
    });
  }

  /**
   * Connect to external services
   */
  private async connectServices(): Promise<void> {
    try {
      // Connect to Redis bridge
      await this.redisBridge.connect();
      
      // Subscribe to haunts channel
      await this.redisBridge.subscribe('haunts', (message, channel) => {
        console.log(`👻 Received ethereal message on ${channel}:`, message);
        
        // Re-emit to local EventHub
        if (message.type) {
          this.eventHub.emit(message);
        }
      });

      // Bridge local events to Redis
      this.eventHub.subscribe((event: SpectralEvent) => {
        // Only bridge certain event types to prevent loops
        const bridgeableTypes = ['user_message', 'plugin_event', 'spectral_disturbance'];
        
        if (bridgeableTypes.includes(event.type)) {
          this.redisBridge.publish('haunts', event).catch(error => {
            console.error('Failed to bridge event to Redis:', error);
          });
        }
      });

      console.log('🌉 Connected to ethereal services');
    } catch (error) {
      console.error('Failed to connect to services:', error);
    }
  }

  /**
   * Load plugins from manifest
   */
  private async loadPlugins(): Promise<void> {
    try {
      const plugins = await this.pluginLoader.loadAllPlugins('plugins.yaml', this.eventHub);
      
      // Set up plugin event routing
      this.pluginLoader.setupPluginEventRouting(plugins, this.eventHub);
      
      // Start plugin health monitoring
      this.pluginLoader.startPluginHealthMonitoring(this.eventHub);
      
      console.log(`🎭 Loaded ${plugins.size} spectral plugins`);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }

  /**
   * Start the spectral server
   */
  async start(): Promise<void> {
    if (this.enableClustering && cluster.isMaster) {
      // Master process - cluster is already started
      return;
    }

    this.server.listen(this.port, () => {
      console.log(`👻 Phantom Framework haunting port ${this.port}`);
      console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🕸️ Process ID: ${process.pid}`);
      
      // Emit server started event
      this.eventHub.emit({
        type: 'server_started',
        source: 'PhantomApp',
        timestamp: Date.now(),
        data: {
          port: this.port,
          pid: process.pid,
          environment: process.env.NODE_ENV,
        },
        metadata: {
          haunted: true,
          intensity: 0.3,
        },
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    console.log('🌙 Phantom Framework beginning graceful shutdown...');
    
    try {
      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => resolve());
        });
      }

      // Disconnect services
      await this.redisBridge.disconnect();
      
      // Stop cluster if master
      if (this.clusterManager) {
        await this.clusterManager.stopCluster();
      }

      console.log('👻 Phantom Framework has departed the spectral realm');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the application
if (require.main === module) {
  const app = new PhantomApp();
  app.start().catch(error => {
    console.error('Failed to start Phantom Framework:', error);
    process.exit(1);
  });
}

export default PhantomApp;