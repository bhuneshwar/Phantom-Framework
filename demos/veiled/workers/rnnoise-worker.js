/**
 * RNNoise Web Worker - Audio noise suppression for séance clarity
 * Processes audio streams to remove background noise while preserving spectral voices
 */

// Mock RNNoise implementation for demonstration
// In production, you would use the actual RNNoise WASM module
class MockRNNoise {
  constructor() {
    this.isInitialized = false;
    this.sampleRate = 48000;
    this.frameSize = 480; // 10ms at 48kHz
    this.noiseGate = 0.1;
    this.spectralPreservation = 0.3; // Preserve some "spectral" frequencies
  }

  async initialize() {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isInitialized = true;
    return true;
  }

  processFrame(audioFrame) {
    if (!this.isInitialized) {
      return audioFrame;
    }

    const processedFrame = new Float32Array(audioFrame.length);
    
    for (let i = 0; i < audioFrame.length; i++) {
      let sample = audioFrame[i];
      
      // Simple noise gate
      if (Math.abs(sample) < this.noiseGate) {
        sample *= 0.1; // Reduce low-level noise
      }
      
      // Preserve some high-frequency content (for "spectral voices")
      if (i % 4 === 0 && Math.abs(sample) > 0.05) {
        // Preserve every 4th sample if it's above threshold
        sample *= (1 + this.spectralPreservation);
      }
      
      // Apply gentle low-pass filter to reduce harsh noise
      if (i > 0) {
        sample = sample * 0.7 + processedFrame[i - 1] * 0.3;
      }
      
      processedFrame[i] = Math.max(-1, Math.min(1, sample));
    }
    
    return processedFrame;
  }

  destroy() {
    this.isInitialized = false;
  }
}

// Worker state
let rnnoise = null;
let isProcessing = false;
let processedFrames = 0;
let spectralAnomalies = 0;

// Initialize RNNoise when worker starts
async function initializeRNNoise() {
  try {
    rnnoise = new MockRNNoise();
    await rnnoise.initialize();
    
    postMessage({
      type: 'initialized',
      success: true,
      message: 'RNNoise worker initialized successfully'
    });
  } catch (error) {
    postMessage({
      type: 'initialized',
      success: false,
      error: error.message
    });
  }
}

// Process audio frame
function processAudioFrame(audioData, sampleRate) {
  if (!rnnoise || !rnnoise.isInitialized) {
    return audioData;
  }

  try {
    isProcessing = true;
    
    // Convert to Float32Array if needed
    const inputFrame = audioData instanceof Float32Array ? 
      audioData : new Float32Array(audioData);
    
    // Process the frame
    const outputFrame = rnnoise.processFrame(inputFrame);
    
    // Detect spectral anomalies (sudden changes that might be "voices")
    const inputEnergy = calculateEnergy(inputFrame);
    const outputEnergy = calculateEnergy(outputFrame);
    const energyRatio = outputEnergy / (inputEnergy + 1e-10);
    
    // If output energy is significantly different, it might be spectral
    if (Math.abs(energyRatio - 1.0) > 0.3) {
      spectralAnomalies++;
    }
    
    processedFrames++;
    
    // Send processed audio back
    postMessage({
      type: 'processed',
      audioData: outputFrame,
      metadata: {
        inputEnergy,
        outputEnergy,
        energyRatio,
        frameNumber: processedFrames,
        spectralAnomalies,
        isSpectralAnomaly: Math.abs(energyRatio - 1.0) > 0.3
      }
    });
    
  } catch (error) {
    postMessage({
      type: 'error',
      error: error.message,
      frameNumber: processedFrames
    });
  } finally {
    isProcessing = false;
  }
}

// Calculate audio energy for anomaly detection
function calculateEnergy(audioFrame) {
  let energy = 0;
  for (let i = 0; i < audioFrame.length; i++) {
    energy += audioFrame[i] * audioFrame[i];
  }
  return Math.sqrt(energy / audioFrame.length);
}

// Handle messages from main thread
self.onmessage = function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'initialize':
      initializeRNNoise();
      break;
      
    case 'process':
      if (data.audioData) {
        processAudioFrame(data.audioData, data.sampleRate || 48000);
      }
      break;
      
    case 'configure':
      if (rnnoise && data.config) {
        // Update configuration
        if (data.config.noiseGate !== undefined) {
          rnnoise.noiseGate = data.config.noiseGate;
        }
        if (data.config.spectralPreservation !== undefined) {
          rnnoise.spectralPreservation = data.config.spectralPreservation;
        }
        
        postMessage({
          type: 'configured',
          config: {
            noiseGate: rnnoise.noiseGate,
            spectralPreservation: rnnoise.spectralPreservation
          }
        });
      }
      break;
      
    case 'getStats':
      postMessage({
        type: 'stats',
        stats: {
          processedFrames,
          spectralAnomalies,
          isProcessing,
          isInitialized: rnnoise?.isInitialized || false,
          anomalyRate: processedFrames > 0 ? spectralAnomalies / processedFrames : 0
        }
      });
      break;
      
    case 'reset':
      processedFrames = 0;
      spectralAnomalies = 0;
      postMessage({
        type: 'reset',
        success: true
      });
      break;
      
    case 'destroy':
      if (rnnoise) {
        rnnoise.destroy();
        rnnoise = null;
      }
      processedFrames = 0;
      spectralAnomalies = 0;
      postMessage({
        type: 'destroyed',
        success: true
      });
      break;
      
    default:
      postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`
      });
  }
};

// Handle worker errors
self.onerror = function(error) {
  postMessage({
    type: 'worker_error',
    error: error.message,
    filename: error.filename,
    lineno: error.lineno
  });
};

// Notify that worker is ready
postMessage({
  type: 'ready',
  message: 'RNNoise worker is ready for initialization'
});