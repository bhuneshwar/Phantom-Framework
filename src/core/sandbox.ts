import { Worker } from 'worker_threads';
import { resolve } from 'path';
import { IWorkerSandbox, Permission, SpectralError, SpectralErrorType } from './types';

/**
 * Containment Circle - Web Worker sandbox for plugin isolation
 * Provides secure execution environment for untrusted haunt packs
 */
export class WorkerSandbox implements IWorkerSandbox {
  private worker: Worker | null = null;
  private isTerminated = false;
  private readonly permissions: Set<Permission>;
  private readonly timeout: number;

  constructor(
    private readonly workerScript: string,
    permissions: Permission[] = [],
    timeout: number = 30000
  ) {
    this.permissions = new Set(permissions);
    this.timeout = timeout;
  }

  /**
   * Execute code within the containment circle
   * Runs plugin code in isolated worker thread with permission checks
   */
  async execute<T, R>(code: string, data: T): Promise<R> {
    if (this.isTerminated) {
      throw this.createSpectralError(
        SpectralErrorType.BANISHMENT_REQUIRED,
        'Sandbox has been terminated and cannot execute code',
        'WorkerSandbox'
      );
    }

    try {
      // Validate code permissions before execution
      this.validateCodePermissions(code);

      // Create worker if not exists
      if (!this.worker) {
        await this.createWorker();
      }

      return await this.executeInWorker(code, data);
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.DISTURBANCE_DETECTED,
        `Sandbox execution failed: ${(error as Error).message}`,
        'WorkerSandbox'
      );
    }
  }

  /**
   * Terminate the worker and clean up resources
   * Banishes the contained spirits back to the void
   */
  terminate(): void {
    if (this.worker && !this.isTerminated) {
      this.worker.terminate();
      this.worker = null;
      this.isTerminated = true;
    }
  }

  /**
   * Check if the sandbox worker is still alive
   */
  isAlive(): boolean {
    return !this.isTerminated && this.worker !== null;
  }

  /**
   * Create a new worker thread with the sandbox script
   */
  private async createWorker(): Promise<void> {
    const workerPath = resolve(__dirname, this.workerScript);
    
    this.worker = new Worker(workerPath, {
      workerData: {
        permissions: Array.from(this.permissions),
        timeout: this.timeout,
      },
    });

    // Handle worker errors
    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.terminate();
    });

    // Handle worker exit
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`Worker exited with code ${code}`);
      }
      this.worker = null;
    });
  }

  /**
   * Execute code in the worker thread with timeout
   */
  private async executeInWorker<T, R>(code: string, data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeoutId = setTimeout(() => {
        this.terminate();
        reject(this.createSpectralError(
          SpectralErrorType.DISTURBANCE_DETECTED,
          'Sandbox execution timeout',
          'WorkerSandbox'
        ));
      }, this.timeout);

      // Listen for result
      this.worker.once('message', (result) => {
        clearTimeout(timeoutId);
        
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.data);
        }
      });

      // Send code and data to worker
      this.worker.postMessage({
        code,
        data,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Validate code against permission restrictions
   * Checks for forbidden operations based on granted permissions
   */
  private validateCodePermissions(code: string): void {
    const forbiddenPatterns = [
      // Network access patterns
      {
        pattern: /(?:fetch|XMLHttpRequest|http|https|net|socket)/i,
        permission: Permission.NETWORK_ACCESS,
        description: 'Network access',
      },
      // File system patterns
      {
        pattern: /(?:fs|readFile|writeFile|unlink|mkdir|rmdir)/i,
        permission: Permission.FILE_SYSTEM,
        description: 'File system access',
      },
      // Process spawning patterns
      {
        pattern: /(?:spawn|exec|fork|child_process)/i,
        permission: Permission.PROCESS_SPAWN,
        description: 'Process spawning',
      },
      // Dangerous eval patterns
      {
        pattern: /(?:eval|Function|setTimeout|setInterval)/i,
        permission: null, // Always forbidden
        description: 'Dynamic code execution',
      },
    ];

    for (const { pattern, permission, description } of forbiddenPatterns) {
      if (pattern.test(code)) {
        if (permission === null || !this.permissions.has(permission)) {
          throw new Error(`Forbidden operation detected: ${description}`);
        }
      }
    }

    // Check for attempts to escape sandbox
    const escapePatterns = [
      /process\.exit/i,
      /global\./i,
      /require\(/i,
      /import\(/i,
      /__dirname/i,
      /__filename/i,
    ];

    for (const pattern of escapePatterns) {
      if (pattern.test(code)) {
        throw new Error('Sandbox escape attempt detected');
      }
    }
  }

  /**
   * Create a spectral error with proper typing
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
    error.haunt_level = 0.7;
    error.recovery_possible = type !== SpectralErrorType.REALM_COLLAPSE;
    
    return error;
  }
}

/**
 * Sandbox manager for creating and managing multiple containment circles
 */
export class SandboxManager {
  private sandboxes = new Map<string, WorkerSandbox>();
  private readonly defaultWorkerScript = './sandbox-worker.js';

  /**
   * Create a new sandbox for a plugin
   */
  createSandbox(
    pluginId: string,
    permissions: Permission[] = [],
    timeout: number = 30000
  ): WorkerSandbox {
    const sandbox = new WorkerSandbox(this.defaultWorkerScript, permissions, timeout);
    this.sandboxes.set(pluginId, sandbox);
    return sandbox;
  }

  /**
   * Get existing sandbox for a plugin
   */
  getSandbox(pluginId: string): WorkerSandbox | undefined {
    return this.sandboxes.get(pluginId);
  }

  /**
   * Terminate and remove a sandbox
   */
  terminateSandbox(pluginId: string): void {
    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      sandbox.terminate();
      this.sandboxes.delete(pluginId);
    }
  }

  /**
   * Terminate all sandboxes
   */
  terminateAll(): void {
    for (const [pluginId, sandbox] of this.sandboxes) {
      sandbox.terminate();
    }
    this.sandboxes.clear();
  }

  /**
   * Get status of all sandboxes
   */
  getStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    for (const [pluginId, sandbox] of this.sandboxes) {
      status.set(pluginId, sandbox.isAlive());
    }
    return status;
  }
}