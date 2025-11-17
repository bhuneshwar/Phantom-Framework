import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

// Import Phantom Framework core
import { EventHub } from '@phantom/core/eventHub';
import { PluginLoader } from '@phantom/core/loader';
import { SpectralEvent } from '@phantom/core/types';

/**
 * Veiled Voices - WebRTC Group Audio Séance Demo
 * A haunted application for group audio communication with AI spirits
 */

class VeiledVoicesApp {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private eventHub: EventHub;
  private pluginLoader: PluginLoader;
  
  private readonly port: number;
  private activeSessions = new Map<string, SeanceSession>();
  private connectedSpirits = new Map<string, SpiritConnection>();

  constructor() {
    this.port = parseInt(process.env.PORT || '3001');
    this.app = express();
    this.eventHub = new EventHub();
    this.pluginLoader = new PluginLoader(path.join(__dirname));
    
    this.initializeApp();
  }

  /**
   * Initialize the séance application
   */
  private async initializeApp(): Promise<void> {
    console.log('🕯️ Lighting candles for the Veiled Voices séance...');
    
    await this.setupExpress();
    await this.setupSocketIO();
    await this.loadSeancePlugins();
    await this.setupSpectralEventHandlers();
    
    console.log('👻 Veiled Voices séance chamber prepared');
  }

  /**
   * Set up Express server for static files and API
   */
  private async setupExpress(): Promise<void> {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());

    // Séance status endpoint
    this.app.get('/api/seance/status', (req, res) => {
      const sessions = Array.from(this.activeSessions.values()).map(session => ({
        id: session.id,
        participantCount: session.participants.length,
        aiHauntCount: session.aiHaunts.length,
        atmosphereLevel: session.atmosphereLevel,
        activeRituals: session.activeRituals,
        isActive: session.isActive,
      }));

      res.json({
        activeSessions: sessions.length,
        totalParticipants: Array.from(this.connectedSpirits.size),
        spectralActivity: this.eventHub.getSpectralMetrics(),
        haunted: sessions.some(s => s.atmosphereLevel > 0.7),
      });
    });

    // Create new séance session
    this.app.post('/api/seance/create', (req, res) => {
      const { sessionName, maxParticipants = 8, hauntIntensity = 0.5 } = req.body;
      
      const sessionId = `seance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: SeanceSession = {
        id: sessionId,
        name: sessionName || 'Unnamed Séance',
        participants: [],
        aiHaunts: [],
        activeRituals: [],
        atmosphereLevel: 0.1,
        maxParticipants,
        hauntIntensity,
        isActive: true,
        createdAt: Date.now(),
      };

      this.activeSessions.set(sessionId, session);
      
      // Emit session creation event
      this.eventHub.emit({
        type: 'seance_created',
        source: 'VeiledVoicesApp',
        timestamp: Date.now(),
        data: { sessionId, sessionName, maxParticipants },
        metadata: {
          haunted: true,
          intensity: hauntIntensity,
        },
      });

      res.json({
        sessionId,
        session,
        message: 'Séance chamber has been prepared',
        haunted: true,
      });
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'haunting',
        timestamp: Date.now(),
        activeSessions: this.activeSessions.size,
        connectedSpirits: this.connectedSpirits.size,
        spectralEnergy: this.eventHub.getSpectralMetrics().hauntLevel,
      });
    });

    this.server = createServer(this.app);
  }

  /**
   * Set up Socket.IO for real-time séance communication
   */
  private async setupSocketIO(): Promise<void> {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      console.log(`👻 Spirit entered the séance: ${socket.id}`);
      
      // Register spirit connection
      const spirit: SpiritConnection = {
        id: socket.id,
        role: 'participant',
        joinedAt: Date.now(),
        isActive: true,
        sentimentScore: 0,
        hauntLevel: 0,
        sessionId: null,
      };
      
      this.connectedSpirits.set(socket.id, spirit);

      // Handle séance joining
      socket.on('join_seance', async (data) => {
        const { sessionId, spiritName, role = 'participant' } = data;
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
          socket.emit('seance_error', { 
            error: 'Séance chamber not found',
            haunted: true 
          });
          return;
        }

        if (session.participants.length >= session.maxParticipants) {
          socket.emit('seance_error', { 
            error: 'Séance chamber is at capacity',
            haunted: true 
          });
          return;
        }

        // Add participant to session
        const participant: AudioPeer = {
          id: socket.id,
          socketId: socket.id,
          name: spiritName || `Spirit_${socket.id.substr(0, 6)}`,
          role: role as 'medium' | 'participant' | 'spirit',
          joinedAt: Date.now(),
          isConnected: true,
          audioEnabled: false,
          sentimentScore: 0,
          hauntLevel: 0,
        };

        session.participants.push(participant);
        spirit.sessionId = sessionId;
        spirit.role = role;

        // Join socket room
        socket.join(sessionId);
        
        // Notify all participants
        this.io.to(sessionId).emit('participant_joined', {
          participant,
          sessionId,
          totalParticipants: session.participants.length,
          haunted: true,
        });

        // Send session info to new participant
        socket.emit('seance_joined', {
          sessionId,
          session,
          yourId: socket.id,
          participants: session.participants,
          message: `Welcome to the séance, ${participant.name}`,
          haunted: true,
        });

        // Emit spectral event
        this.eventHub.emit({
          type: 'participant_joined_seance',
          source: 'VeiledVoicesApp',
          timestamp: Date.now(),
          data: { sessionId, participantId: socket.id, participantName: participant.name },
          metadata: {
            haunted: true,
            intensity: 0.3,
          },
        });
      });

      // Handle WebRTC signaling
      socket.on('webrtc_offer', (data) => {
        const { targetId, offer, sessionId } = data;
        socket.to(targetId).emit('webrtc_offer', {
          fromId: socket.id,
          offer,
          sessionId,
        });
      });

      socket.on('webrtc_answer', (data) => {
        const { targetId, answer, sessionId } = data;
        socket.to(targetId).emit('webrtc_answer', {
          fromId: socket.id,
          answer,
          sessionId,
        });
      });

      socket.on('webrtc_ice_candidate', (data) => {
        const { targetId, candidate, sessionId } = data;
        socket.to(targetId).emit('webrtc_ice_candidate', {
          fromId: socket.id,
          candidate,
          sessionId,
        });
      });

      // Handle audio state changes
      socket.on('audio_state_changed', (data) => {
        const { sessionId, audioEnabled } = data;
        const session = this.activeSessions.get(sessionId);
        const spirit = this.connectedSpirits.get(socket.id);
        
        if (session && spirit) {
          const participant = session.participants.find(p => p.id === socket.id);
          if (participant) {
            participant.audioEnabled = audioEnabled;
            
            // Notify other participants
            socket.to(sessionId).emit('participant_audio_changed', {
              participantId: socket.id,
              audioEnabled,
              haunted: true,
            });
          }
        }
      });

      // Handle spectral messages
      socket.on('spectral_message', (data) => {
        const spirit = this.connectedSpirits.get(socket.id);
        if (spirit?.sessionId) {
          // Broadcast to session
          socket.to(spirit.sessionId).emit('spectral_message', {
            fromId: socket.id,
            message: data.message,
            timestamp: Date.now(),
            haunted: Math.random() < 0.3,
          });

          // Emit to EventHub for AI processing
          this.eventHub.emit({
            type: 'seance_message',
            source: socket.id,
            timestamp: Date.now(),
            data: {
              sessionId: spirit.sessionId,
              message: data.message,
              participantId: socket.id,
            },
            metadata: {
              haunted: true,
              intensity: Math.random() * 0.5,
            },
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🌫️ Spirit departed the séance: ${socket.id}`);
        
        const spirit = this.connectedSpirits.get(socket.id);
        if (spirit?.sessionId) {
          const session = this.activeSessions.get(spirit.sessionId);
          if (session) {
            // Remove participant from session
            session.participants = session.participants.filter(p => p.id !== socket.id);
            
            // Notify remaining participants
            socket.to(spirit.sessionId).emit('participant_left', {
              participantId: socket.id,
              remainingParticipants: session.participants.length,
              haunted: true,
            });

            // Clean up empty sessions
            if (session.participants.length === 0) {
              this.activeSessions.delete(spirit.sessionId);
              console.log(`🕯️ Séance ${spirit.sessionId} has ended - no spirits remain`);
            }
          }
        }
        
        this.connectedSpirits.delete(socket.id);
      });
    });
  }

  /**
   * Load séance-specific plugins
   */
  private async loadSeancePlugins(): Promise<void> {
    try {
      const plugins = await this.pluginLoader.loadAllPlugins('plugins.yaml', this.eventHub);
      
      // Set up plugin event routing
      this.pluginLoader.setupPluginEventRouting(plugins, this.eventHub);
      
      console.log(`🎭 Summoned ${plugins.size} séance plugins`);
    } catch (error) {
      console.error('Failed to summon séance plugins:', error);
    }
  }

  /**
   * Set up spectral event handlers
   */
  private async setupSpectralEventHandlers(): Promise<void> {
    // Handle AI haunt events
    this.eventHub.subscribe((event: SpectralEvent) => {
      if (event.type === 'ai_haunt_manifestation') {
        const { sessionId, hauntMessage, intensity } = event.data;
        
        // Broadcast haunt to session participants
        this.io.to(sessionId).emit('ai_haunt', {
          message: hauntMessage,
          intensity,
          timestamp: Date.now(),
          haunted: true,
        });

        // Update session atmosphere
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.atmosphereLevel = Math.min(1.0, session.atmosphereLevel + intensity * 0.2);
        }
      }

      // Handle sentiment analysis results
      if (event.type === 'sentiment_analysis') {
        const { sessionId, participantId, sentiment, score } = event.data;
        const session = this.activeSessions.get(sessionId);
        
        if (session) {
          const participant = session.participants.find(p => p.id === participantId);
          if (participant) {
            participant.sentimentScore = score;
            
            // Trigger haunts based on high emotion
            if (Math.abs(score) > 0.7) {
              this.eventHub.emit({
                type: 'high_emotion_detected',
                source: 'VeiledVoicesApp',
                timestamp: Date.now(),
                data: { sessionId, participantId, sentiment, score },
                metadata: {
                  haunted: true,
                  intensity: Math.abs(score),
                },
              });
            }
          }
        }
      }
    });
  }

  /**
   * Start the séance server
   */
  async start(): Promise<void> {
    this.server.listen(this.port, () => {
      console.log(`🕯️ Veiled Voices séance chamber open on port ${this.port}`);
      console.log(`👻 Spirits may enter at http://localhost:${this.port}`);
      
      // Emit server started event
      this.eventHub.emit({
        type: 'seance_server_started',
        source: 'VeiledVoicesApp',
        timestamp: Date.now(),
        data: { port: this.port },
        metadata: {
          haunted: true,
          intensity: 0.5,
        },
      });
    });
  }
}

// Type definitions for Veiled Voices
interface SeanceSession {
  id: string;
  name: string;
  participants: AudioPeer[];
  aiHaunts: AIHaunt[];
  activeRituals: string[];
  atmosphereLevel: number; // 0-1
  maxParticipants: number;
  hauntIntensity: number;
  isActive: boolean;
  createdAt: number;
}

interface AudioPeer {
  id: string;
  socketId: string;
  name: string;
  role: 'medium' | 'participant' | 'spirit';
  joinedAt: number;
  isConnected: boolean;
  audioEnabled: boolean;
  sentimentScore: number;
  hauntLevel: number;
}

interface AIHaunt {
  id: string;
  personality: 'mischievous' | 'melancholy' | 'malevolent';
  voiceModel: string;
  interruptionProbability: number;
  lastManifestation: number;
  isActive: boolean;
}

interface SpiritConnection {
  id: string;
  role: string;
  joinedAt: number;
  isActive: boolean;
  sentimentScore: number;
  hauntLevel: number;
  sessionId: string | null;
}

// Start the séance application
if (require.main === module) {
  const app = new VeiledVoicesApp();
  app.start().catch(error => {
    console.error('Failed to start Veiled Voices séance:', error);
    process.exit(1);
  });
}

export default VeiledVoicesApp;