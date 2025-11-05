const { parentPort, workerData } = require('worker_threads');

/**
 * Sandbox Worker Script - The Containment Circle
 * Executes plugin code in isolated environment with permission checks
 */

// Extract worker configuration
const { permissions = [], timeout = 30000 } = workerData || {};

// Create restricted global context
const createSandboxContext = () => {
  const context = {
    // Safe built-ins
    console: {
      log: (...args) => parentPort?.postMessage({ type: 'log', data: args }),
      warn: (...args) => parentPort?.postMessage({ type: 'warn', data: args }),
      error: (...args) => parentPort?.postMessage({ type: 'error', data: args }),
    },
    
    // Math and basic utilities
    Math,
    Date,
    JSON,
    
    // Safe array and object methods
    Array,
    Object,
    
    // RxJS operators (limited subset)
    map: require('rxjs/operators').map,
    filter: require('rxjs/operators').filter,
    switchMap: require('rxjs/operators').switchMap,
    
    // Phantom Framework types (read-only)
    SpectralEvent: class SpectralEvent {
      constructor(type, data, source = 'sandbox') {
        this.type = type;
        this.data = data;
        this.source = source;
        this.timestamp = Date.now();
        this.metadata = { haunted: true };
      }
    },
  };

  // Add permission-based APIs
  if (permissions.includes('network_access')) {
    // Limited network access could be added here
    context.fetch = require('node-fetch');
  }

  if (permissions.includes('spectral_write')) {
    context.emit = (event) => {
      parentPort?.postMessage({ type: 'spectral_event', data: event });
    };
  }

  return context;
};

// Message handler for code execution
parentPort?.on('message', async (message) => {
  const { code, data, timestamp } = message;
  
  try {
    // Create execution timeout
    const executionTimeout = setTimeout(() => {
      throw new Error('Execution timeout exceeded');
    }, timeout);

    // Create sandbox context
    const context = createSandboxContext();
    
    // Add input data to context
    context.input = data;
    context.timestamp = timestamp;

    // Create function with restricted scope
    const sandboxFunction = new Function(
      ...Object.keys(context),
      `
        "use strict";
        try {
          ${code}
        } catch (error) {
          throw new Error('Sandbox execution error: ' + error.message);
        }
      `
    );

    // Execute code with context
    const result = await sandboxFunction(...Object.values(context));
    
    clearTimeout(executionTimeout);
    
    // Send result back to main thread
    parentPort?.postMessage({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    // Send error back to main thread
    parentPort?.postMessage({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  parentPort?.postMessage({
    success: false,
    error: `Uncaught exception: ${error.message}`,
    timestamp: Date.now(),
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  parentPort?.postMessage({
    success: false,
    error: `Unhandled rejection: ${reason}`,
    timestamp: Date.now(),
  });
  process.exit(1);
});

// Notify parent that worker is ready
parentPort?.postMessage({
  type: 'ready',
  permissions,
  timestamp: Date.now(),
});