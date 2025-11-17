import { Observable, Subject, fromEvent, merge, EMPTY, timer } from 'rxjs';
import { map, filter, switchMap, tap, catchError, debounceTime } from 'rxjs/operators';
import {
  IPlugin,
  IEventHub,
  SpectralEvent,
  PluginManifest,
  PluginState,
} from '@phantom/core/types';

/**
 * WebRTC Séance Plugin - Handles peer-to-peer audio streaming for group séances
 * Manages RTCPeerConnection, audio capture, and spectral audio processing
 */
export class WebRTCSeancePlugin implements IPlugin {
  readonly id = 'webrtc_seance';
  readonly manifest: PluginManifest = {
    plugins: [{
      id: 'webrtc_seance',
      path: './plugins/webrtc.ts',
      class: 'WebRTCSeancePlugin',
      haunt_probability: 0.4,
    }],
    version: '1.0.0',
    author: 'Veiled Voices Coven',
    description: 'WebRTC audio streaming with spectral enhancements',
    spookiness_level: 'terrifying',
  };

  private hub?: IEventHub;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private audioStreams = new Map<string, MediaStream>();
  private audioContext?: AudioContext;
  private spectralProcessors = new Map<string, AudioWorkletNode>();
  private isInitialized = false;
  private hauntingIntensity = 0;
  private audioAnalysers = new Map<string, AnalyserNode>();

  // WebRTC configuration with STUN servers
  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN server configuration for production
      // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
    ],
    iceCandidatePoolSize: 10,
  };

  /**
   * Initialize the WebRTC séance plugin
   */
  async init(hub: IEventHub): Promise<void> {
    this.hub = hub;
    
    console.log('🌐 Initializing WebRTC séance portal...');
    
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load spectral audio worklet
      await this.loadSpectralAudioWorklet();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      
      // Emit initialization event
      hub.emit({
        type: 'webrtc_plugin_initialized',
        source: this.id,
        timestamp: Date.now(),
        data: { message: 'WebRTC séance portal is open' },
        metadata: {
          haunted: true,
          intensity: 0.4,
        },
      });
      
      console.log('👻 WebRTC séance portal opened successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC plugin:', error);
      throw error;
    }
  }

  /**
   * Process spectral events related to WebRTC
   */
  process(event: SpectralEvent): Observable<SpectralEvent> {
    if (!this.isInitialized || !this.hub) {
      return EMPTY;
    }

    switch (event.type) {
      case 'webrtc_create_peer':
        return this.handleCreatePeer(event);
      
      case 'webrtc_offer':
        return this.handleOffer(event);
      
      case 'webrtc_answer':
        return this.handleAnswer(event);
      
      case 'webrtc_ice_candidate':
        return this.handleIceCandidate(event);
      
      case 'audio_stream_request':
        return this.handleAudioStreamRequest(event);
      
      case 'haunt_audio_stream':
        return this.handleAudioHaunting(event);
      
      default:
        return EMPTY;
    }
  }

  /**
   * Manifest haunting behavior for audio streams
   */
  haunt(): Observable<SpectralEvent> {
    if (!this.isInitialized) {
      return EMPTY;
    }

    return timer(0, 10000 + Math.random() * 20000).pipe(
      switchMap(() => {
        if (Math.random() > 0.3 || this.peerConnections.size === 0) {
          return EMPTY;
        }

        // Apply spectral effects to random audio streams
        const connectionIds = Array.from(this.peerConnections.keys());
        const targetId = connectionIds[Math.floor(Math.random() * connectionIds.length)];
        
        return this.applySpectralEffects(targetId).pipe(
          map(() => ({
            type: 'audio_haunt_applied',
            source: this.id,
            timestamp: Date.now(),
            data: { 
              targetId,
              effect: this.getRandomSpectralEffect(),
              intensity: this.hauntingIntensity 
            },
            metadata: {
              haunted: true,
              intensity: this.hauntingIntensity,
            },
          }))
        );
      })
    );
  }

  /**
   * Clean up WebRTC resources
   */
  teardown(): void {
    console.log('🌫️ Closing WebRTC séance portal...');
    
    // Close all peer connections
    for (const [peerId, connection] of this.peerConnections) {
      connection.close();
    }
    this.peerConnections.clear();
    
    // Stop all audio streams
    for (const [streamId, stream] of this.audioStreams) {
      stream.getTracks().forEach(track => track.stop());
    }
    this.audioStreams.clear();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.spectralProcessors.clear();
    this.audioAnalysers.clear();
    this.isInitialized = false;
    
    if (this.hub) {
      this.hub.emit({
        type: 'webrtc_plugin_teardown',
        source: this.id,
        timestamp: Date.now(),
        data: { message: 'WebRTC séance portal closed' },
        metadata: {
          haunted: true,
          intensity: 0.2,
        },
      });
    }
  }

  /**
   * Check for WebRTC disturbances
   */
  manifest_disturbance(): boolean {
    // Check for failed connections
    const failedConnections = Array.from(this.peerConnections.values())
      .filter(conn => conn.connectionState === 'failed' || conn.connectionState === 'disconnected');
    
    // Check for audio context issues
    const audioContextIssues = this.audioContext?.state === 'suspended' || 
                              this.audioContext?.state === 'closed';
    
    return failedConnections.length > 0 || audioContextIssues || this.hauntingIntensity > 0.8;
  }

  /**
   * Load spectral audio worklet for audio processing
   */
  private async loadSpectralAudioWorklet(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Create spectral audio worklet code
      const workletCode = `
        class SpectralAudioProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.hauntLevel = 0;
            this.phase = 0;
            this.port.onmessage = (event) => {
              if (event.data.type === 'setHauntLevel') {
                this.hauntLevel = event.data.value;
              }
            };
          }
          
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            const output = outputs[0];
            
            if (input.length > 0 && output.length > 0) {
              const inputChannel = input[0];
              const outputChannel = output[0];
              
              for (let i = 0; i < inputChannel.length; i++) {
                let sample = inputChannel[i];
                
                // Apply spectral effects based on haunt level
                if (this.hauntLevel > 0) {
                  // Add ethereal reverb
                  const delay = Math.sin(this.phase * 0.01) * this.hauntLevel * 0.3;
                  sample += sample * delay;
                  
                  // Add spectral distortion
                  if (this.hauntLevel > 0.5) {
                    sample = Math.tanh(sample * (1 + this.hauntLevel));
                  }
                  
                  // Add ghostly whispers (subtle noise)
                  if (Math.random() < this.hauntLevel * 0.1) {
                    sample += (Math.random() - 0.5) * this.hauntLevel * 0.1;
                  }
                }
                
                outputChannel[i] = sample;
                this.phase++;
              }
            }
            
            return true;
          }
        }
        
        registerProcessor('spectral-audio-processor', SpectralAudioProcessor);
      `;

      // Create blob URL for worklet
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await this.audioContext.audioWorklet.addModule(workletUrl);
      
      // Clean up blob URL
      URL.revokeObjectURL(workletUrl);
      
      console.log('🎵 Spectral audio worklet loaded');
    } catch (error) {
      console.warn('Failed to load spectral audio worklet:', error);
    }
  }

  /**
   * Set up event handlers for WebRTC events
   */
  private setupEventHandlers(): void {
    if (!this.hub) return;

    // Handle high emotion events to increase haunting
    this.hub.subscribe((event: SpectralEvent) => {
      if (event.type === 'high_emotion_detected') {
        this.hauntingIntensity = Math.min(1.0, this.hauntingIntensity + 0.2);
        
        // Apply immediate spectral effects
        const { participantId } = event.data;
        if (this.peerConnections.has(participantId)) {
          this.applySpectralEffects(participantId).subscribe();
        }
      }
    });

    // Decay haunting intensity over time
    setInterval(() => {
      this.hauntingIntensity = Math.max(0, this.hauntingIntensity * 0.95);
    }, 5000);
  }

  /**
   * Handle peer connection creation
   */
  private handleCreatePeer(event: SpectralEvent): Observable<SpectralEvent> {
    const { peerId, isInitiator } = event.data;
    
    return new Observable(observer => {
      try {
        const peerConnection = new RTCPeerConnection(this.rtcConfig);
        this.peerConnections.set(peerId, peerConnection);
        
        // Set up peer connection event handlers
        this.setupPeerConnectionHandlers(peerConnection, peerId);
        
        observer.next({
          type: 'webrtc_peer_created',
          source: this.id,
          timestamp: Date.now(),
          data: { peerId, isInitiator },
          metadata: {
            haunted: true,
            intensity: 0.3,
          },
        });
        
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Handle WebRTC offer
   */
  private handleOffer(event: SpectralEvent): Observable<SpectralEvent> {
    const { peerId, offer } = event.data;
    const peerConnection = this.peerConnections.get(peerId);
    
    if (!peerConnection) {
      return EMPTY;
    }

    return new Observable(observer => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
          observer.next({
            type: 'webrtc_answer_created',
            source: this.id,
            timestamp: Date.now(),
            data: { peerId, answer: peerConnection.localDescription },
            metadata: {
              haunted: true,
              intensity: 0.4,
            },
          });
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Handle WebRTC answer
   */
  private handleAnswer(event: SpectralEvent): Observable<SpectralEvent> {
    const { peerId, answer } = event.data;
    const peerConnection = this.peerConnections.get(peerId);
    
    if (!peerConnection) {
      return EMPTY;
    }

    return new Observable(observer => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
          observer.next({
            type: 'webrtc_answer_processed',
            source: this.id,
            timestamp: Date.now(),
            data: { peerId },
            metadata: {
              haunted: true,
              intensity: 0.3,
            },
          });
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Handle ICE candidate
   */
  private handleIceCandidate(event: SpectralEvent): Observable<SpectralEvent> {
    const { peerId, candidate } = event.data;
    const peerConnection = this.peerConnections.get(peerId);
    
    if (!peerConnection) {
      return EMPTY;
    }

    return new Observable(observer => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
          observer.next({
            type: 'webrtc_ice_candidate_added',
            source: this.id,
            timestamp: Date.now(),
            data: { peerId },
            metadata: {
              haunted: false,
              intensity: 0.1,
            },
          });
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Handle audio stream request
   */
  private handleAudioStreamRequest(event: SpectralEvent): Observable<SpectralEvent> {
    const { peerId, constraints = { audio: true, video: false } } = event.data;
    
    return new Observable(observer => {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          this.audioStreams.set(peerId, stream);
          
          // Add stream to peer connection
          const peerConnection = this.peerConnections.get(peerId);
          if (peerConnection) {
            stream.getTracks().forEach(track => {
              peerConnection.addTrack(track, stream);
            });
          }
          
          // Set up audio analysis
          this.setupAudioAnalysis(peerId, stream);
          
          observer.next({
            type: 'audio_stream_acquired',
            source: this.id,
            timestamp: Date.now(),
            data: { peerId, streamId: stream.id },
            metadata: {
              haunted: true,
              intensity: 0.5,
            },
          });
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Handle audio haunting effects
   */
  private handleAudioHaunting(event: SpectralEvent): Observable<SpectralEvent> {
    const { peerId, intensity = 0.5 } = event.data;
    
    return this.applySpectralEffects(peerId, intensity).pipe(
      map(() => ({
        type: 'audio_haunting_applied',
        source: this.id,
        timestamp: Date.now(),
        data: { peerId, intensity },
        metadata: {
          haunted: true,
          intensity,
        },
      }))
    );
  }

  /**
   * Set up peer connection event handlers
   */
  private setupPeerConnectionHandlers(peerConnection: RTCPeerConnection, peerId: string): void {
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.hub) {
        this.hub.emit({
          type: 'webrtc_ice_candidate_generated',
          source: this.id,
          timestamp: Date.now(),
          data: { peerId, candidate: event.candidate },
          metadata: {
            haunted: false,
            intensity: 0.1,
          },
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (this.hub) {
        this.hub.emit({
          type: 'webrtc_remote_stream_received',
          source: this.id,
          timestamp: Date.now(),
          data: { peerId, stream: event.streams[0] },
          metadata: {
            haunted: true,
            intensity: 0.4,
          },
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (this.hub) {
        this.hub.emit({
          type: 'webrtc_connection_state_changed',
          source: this.id,
          timestamp: Date.now(),
          data: { peerId, state: peerConnection.connectionState },
          metadata: {
            haunted: peerConnection.connectionState === 'failed',
            intensity: peerConnection.connectionState === 'failed' ? 0.8 : 0.2,
          },
        });
      }
    };
  }

  /**
   * Set up audio analysis for spectral effects
   */
  private setupAudioAnalysis(peerId: string, stream: MediaStream): void {
    if (!this.audioContext) return;

    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      this.audioAnalysers.set(peerId, analyser);
      
      // Start audio analysis loop
      this.startAudioAnalysis(peerId, analyser);
    } catch (error) {
      console.error('Failed to set up audio analysis:', error);
    }
  }

  /**
   * Start audio analysis for spectral detection
   */
  private startAudioAnalysis(peerId: string, analyser: AnalyserNode): void {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const analyze = () => {
      if (!this.audioAnalysers.has(peerId)) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate audio intensity
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const intensity = average / 255;
      
      // Detect spectral anomalies (sudden changes in frequency spectrum)
      const highFreqEnergy = dataArray.slice(bufferLength * 0.7).reduce((sum, value) => sum + value, 0);
      const isSpectralAnomaly = highFreqEnergy > bufferLength * 0.3 * 128; // Threshold for anomaly
      
      if (isSpectralAnomaly && this.hub) {
        this.hub.emit({
          type: 'spectral_anomaly_detected',
          source: this.id,
          timestamp: Date.now(),
          data: { peerId, intensity, highFreqEnergy },
          metadata: {
            haunted: true,
            intensity: Math.min(1.0, intensity + 0.3),
          },
        });
      }
      
      requestAnimationFrame(analyze);
    };
    
    analyze();
  }

  /**
   * Apply spectral effects to audio stream
   */
  private applySpectralEffects(peerId: string, intensity: number = this.hauntingIntensity): Observable<void> {
    return new Observable(observer => {
      const processor = this.spectralProcessors.get(peerId);
      
      if (processor) {
        // Update haunt level in audio worklet
        processor.port.postMessage({
          type: 'setHauntLevel',
          value: intensity,
        });
        
        console.log(`👻 Applied spectral effects to ${peerId} with intensity ${intensity}`);
      }
      
      observer.next();
      observer.complete();
    });
  }

  /**
   * Get random spectral effect name
   */
  private getRandomSpectralEffect(): string {
    const effects = [
      'ethereal_reverb',
      'ghostly_whispers',
      'spectral_distortion',
      'haunted_echo',
      'otherworldly_chorus',
      'phantom_delay',
    ];
    
    return effects[Math.floor(Math.random() * effects.length)];
  }
}