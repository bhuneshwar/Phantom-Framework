import cluster from 'cluster';
import os from 'os';
import { EventEmitter } from 'events';
import { SpectralError, SpectralErrorType } from '../core/types';

/**
 * Coven Network - PM2-based cluster management for horizontal scaling
 * Manages multiple worker processes in the spectral realm
 */

export interface ClusterConfig {
  instances: number | 'max';
  maxMemoryRestart: string;
  minUptime: number;
  maxRestarts: number;
  restartDelay: number;
  killTimeout: number;
  listenTimeout: number;
  hauntedWorkerThreshold: number; // Memory/CPU threshold for "haunted" workers
}

export interface ClusterStatus {
  masterPid: number;
  workers: WorkerInfo[];
  totalWorkers: number;
  aliveWorkers: number;
  hauntedWorkers: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface WorkerInfo {
  id: number;
  pid: number;
  state: 'online' | 'disconnected' | 'dead' | 'haunted';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  restartCount: number;
  isHaunted: boolean;
  lastHeartbeat: number;
}

/**
 * Cluster manager for the spectral coven
 */
export class ClusterManager extends EventEmitter {
  private readonly config: ClusterConfig;
  private workers = new Map<number, WorkerInfo>();
  private startTime = Date.now();
  private isShuttingDown = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private hauntDetectionInterval?: NodeJS.Timeout;

  constructor(config: Partial<ClusterConfig> = {}) {
    super();
    
    this.config = {
      instances: 'max',
      maxMemoryRestart: '500M',
      minUptime: 10000, // 10 seconds
      maxRestarts: 5,
      restartDelay: 1000,
      killTimeout: 5000,
      listenTimeout: 3000,
      hauntedWorkerThreshold: 0.8, // 80% memory/CPU threshold
      ...config,
    };
  }

  /**
   * Start the spectral coven cluster
   */
  async startCluster(instances?: number): Promise<void> {
    if (!cluster.isMaster) {
      throw new Error('Cluster can only be started from master process');
    }

    const workerCount = instances || this.getInstanceCount();
    
    console.log(`🕸️ Summoning spectral coven with ${workerCount} workers...`);
    
    // Set up cluster event handlers
    this.setupClusterEvents();
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    // Start haunt detection
    this.startHauntDetection();
    
    // Fork workers
    for (let i = 0; i < workerCount; i++) {
      await this.forkWorker();
      
      // Stagger worker creation to prevent resource contention
      if (i < workerCount - 1) {
        await this.delay(500);
      }
    }

    // Set up graceful shutdown
    this.setupGracefulShutdown();
    
    this.emit('cluster_started', {
      workerCount,
      masterPid: process.pid,
      timestamp: Date.now(),
    });
    
    console.log(`👻 Spectral coven assembled with ${workerCount} workers`);
  }

  /**
   * Stop the cluster gracefully
   */
  async stopCluster(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('🌙 Dispersing the spectral coven...');

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.hauntDetectionInterval) {
      clearInterval(this.hauntDetectionInterval);
    }

    // Gracefully disconnect all workers
    const shutdownPromises: Promise<void>[] = [];
    
    for (const worker of Object.values(cluster.workers || {})) {
      if (worker) {
        shutdownPromises.push(this.shutdownWorker(worker));
      }
    }

    // Wait for all workers to shutdown
    await Promise.all(shutdownPromises);
    
    this.emit('cluster_stopped', {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    });
    
    console.log('👻 Spectral coven has been dispersed');
  }

  /**
   * Get current cluster status
   */
  getClusterStatus(): ClusterStatus {
    const workers = Array.from(this.workers.values());
    const aliveWorkers = workers.filter(w => w.state === 'online').length;
    const hauntedWorkers = workers.filter(w => w.isHaunted).length;

    return {
      masterPid: process.pid,
      workers,
      totalWorkers: workers.length,
      aliveWorkers,
      hauntedWorkers,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Broadcast message to all workers
   */
  broadcastToWorkers(message: any): void {
    for (const worker of Object.values(cluster.workers || {})) {
      if (worker && worker.state === 'online') {
        try {
          worker.send({
            type: 'spectral_broadcast',
            data: message,
            timestamp: Date.now(),
            from: 'master',
          });
        } catch (error) {
          console.warn(`Failed to send message to worker ${worker.id}:`, error);
        }
      }
    }
  }

  /**
   * Restart a specific worker
   */
  async restartWorker(workerId: number): Promise<void> {
    const worker = cluster.workers?.[workerId];
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    console.log(`🔄 Restarting haunted worker ${workerId}...`);
    
    // Gracefully shutdown the worker
    await this.shutdownWorker(worker);
    
    // Fork a new worker
    await this.forkWorker();
    
    this.emit('worker_restarted', { workerId, timestamp: Date.now() });
  }

  /**
   * Get instance count based on configuration
   */
  private getInstanceCount(): number {
    if (this.config.instances === 'max') {
      return os.cpus().length;
    }
    return Math.max(1, this.config.instances);
  }

  /**
   * Fork a new worker process
   */
  private async forkWorker(): Promise<cluster.Worker> {
    return new Promise((resolve, reject) => {
      const worker = cluster.fork();
      const workerId = worker.id;
      
      // Initialize worker info
      this.workers.set(workerId, {
        id: workerId,
        pid: worker.process.pid || 0,
        state: 'online',
        uptime: Date.now(),
        memoryUsage: 0,
        cpuUsage: 0,
        restartCount: 0,
        isHaunted: false,
        lastHeartbeat: Date.now(),
      });

      // Set up worker timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} failed to start within timeout`));
      }, this.config.listenTimeout);

      worker.on('online', () => {
        clearTimeout(timeout);
        console.log(`👻 Worker ${workerId} (PID: ${worker.process.pid}) joined the coven`);
        resolve(worker);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Set up cluster event handlers
   */
  private setupClusterEvents(): void {
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.id;
      const workerInfo = this.workers.get(workerId);
      
      console.log(`💀 Worker ${workerId} has departed the spectral realm (${signal || code})`);
      
      if (workerInfo) {
        workerInfo.state = 'dead';
        workerInfo.restartCount++;
      }

      // Restart worker if not shutting down and within restart limits
      if (!this.isShuttingDown && workerInfo && workerInfo.restartCount < this.config.maxRestarts) {
        console.log(`🔄 Resurrecting worker ${workerId}...`);
        
        setTimeout(async () => {
          try {
            await this.forkWorker();
          } catch (error) {
            console.error(`Failed to resurrect worker ${workerId}:`, error);
          }
        }, this.config.restartDelay);
      } else if (workerInfo && workerInfo.restartCount >= this.config.maxRestarts) {
        console.error(`💀 Worker ${workerId} has exceeded maximum resurrections and remains banished`);
        this.workers.delete(workerId);
      }

      this.emit('worker_exit', { workerId, code, signal, timestamp: Date.now() });
    });

    cluster.on('disconnect', (worker) => {
      const workerId = worker.id;
      const workerInfo = this.workers.get(workerId);
      
      if (workerInfo) {
        workerInfo.state = 'disconnected';
      }
      
      console.log(`🌫️ Worker ${workerId} has disconnected from the spectral network`);
      this.emit('worker_disconnect', { workerId, timestamp: Date.now() });
    });

    // Handle worker messages
    cluster.on('message', (worker, message) => {
      if (message.type === 'heartbeat') {
        this.handleWorkerHeartbeat(worker.id, message);
      } else if (message.type === 'spectral_event') {
        this.emit('worker_event', { workerId: worker.id, event: message.data });
      }
    });
  }

  /**
   * Handle worker heartbeat messages
   */
  private handleWorkerHeartbeat(workerId: number, heartbeat: any): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    workerInfo.lastHeartbeat = Date.now();
    workerInfo.memoryUsage = heartbeat.memoryUsage || 0;
    workerInfo.cpuUsage = heartbeat.cpuUsage || 0;
    
    // Check if worker is haunted (high resource usage)
    const memoryThreshold = this.parseMemoryString(this.config.maxMemoryRestart);
    const isMemoryHaunted = workerInfo.memoryUsage > memoryThreshold * this.config.hauntedWorkerThreshold;
    const isCpuHaunted = workerInfo.cpuUsage > this.config.hauntedWorkerThreshold;
    
    const wasHaunted = workerInfo.isHaunted;
    workerInfo.isHaunted = isMemoryHaunted || isCpuHaunted;
    
    if (workerInfo.isHaunted && !wasHaunted) {
      console.warn(`👻 Worker ${workerId} has become haunted (high resource usage)`);
      this.emit('worker_haunted', { workerId, memoryUsage: workerInfo.memoryUsage, cpuUsage: workerInfo.cpuUsage });
    } else if (!workerInfo.isHaunted && wasHaunted) {
      console.log(`✨ Worker ${workerId} has been exorcised (resource usage normalized)`);
      this.emit('worker_exorcised', { workerId });
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const heartbeatTimeout = 30000; // 30 seconds
      
      for (const [workerId, workerInfo] of this.workers) {
        if (now - workerInfo.lastHeartbeat > heartbeatTimeout) {
          console.warn(`💔 Worker ${workerId} heartbeat timeout - may be unresponsive`);
          workerInfo.state = 'haunted';
          
          this.emit('worker_timeout', { workerId, lastHeartbeat: workerInfo.lastHeartbeat });
        }
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Start haunt detection for resource monitoring
   */
  private startHauntDetection(): void {
    this.hauntDetectionInterval = setInterval(() => {
      for (const [workerId, workerInfo] of this.workers) {
        if (workerInfo.isHaunted && workerInfo.state === 'online') {
          // Consider restarting heavily haunted workers
          const hauntDuration = Date.now() - workerInfo.lastHeartbeat;
          if (hauntDuration > 60000) { // Haunted for more than 1 minute
            console.log(`🔄 Restarting persistently haunted worker ${workerId}`);
            this.restartWorker(workerId).catch(error => {
              console.error(`Failed to restart haunted worker ${workerId}:`, error);
            });
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Gracefully shutdown a worker
   */
  private async shutdownWorker(worker: cluster.Worker): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`Force killing unresponsive worker ${worker.id}`);
        worker.kill('SIGKILL');
        resolve();
      }, this.config.killTimeout);

      worker.on('disconnect', () => {
        clearTimeout(timeout);
        resolve();
      });

      worker.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Send graceful shutdown signal
      worker.disconnect();
    });
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = () => {
      console.log('🌙 Received shutdown signal, dispersing coven...');
      this.stopCluster().then(() => {
        process.exit(0);
      }).catch((error) => {
        console.error('Error during shutdown:', error);
        process.exit(1);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  /**
   * Parse memory string to bytes
   */
  private parseMemoryString(memStr: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
    };

    const match = memStr.match(/^(\d+)([BKMG]?)$/i);
    if (!match) return 500 * 1024 * 1024; // Default 500MB

    const value = parseInt(match[1]);
    const unit = match[2]?.toUpperCase() || 'B';
    
    return value * (units[unit] || 1);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}