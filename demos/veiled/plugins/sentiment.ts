import { Observable, Subject, fromEvent, EMPTY, of } from 'rxjs';
import { map, filter, switchMap, tap, catchError, debounceTime } from 'rxjs/operators';
import * as tf from '@tensorflow/tfjs-node';
import Sentiment from 'sentiment';
import {
  IPlugin,
  IEventHub,
  SpectralEvent,
  PluginManifest,
} from '@phantom/core/types';

/**
 * Sentiment Oracle Plugin - Analyzes emotional content of séance messages
 * Uses TensorFlow.js and sentiment analysis to detect participant emotions
 */
export class SentimentOraclePlugin implements IPlugin {
  readonly id = 'sentiment_oracle';
  readonly manifest: PluginManifest = {
    plugins: [{
      id: 'sentiment_oracle',
      path: './plugins/sentiment.ts',
      class: 'SentimentOraclePlugin',
      haunt_probability: 0.3,
    }],
    version: '1.0.0',
    author: 'Emotional Spirits Collective',
    description: 'Sentiment analysis for detecting participant emotions and triggering haunts',
    spookiness_level: 'moderate',
  };

  private hub?: IEventHub;
  private sentimentAnalyzer: Sentiment;
  private tfModel?: tf.LayersModel;
  private isInitialized = false;
  private emotionHistory = new Map<string, EmotionProfile>();
  private sessionEmotions = new Map<string, SessionEmotionState>();

  // Emotion thresholds for triggering haunts
  private readonly emotionThresholds = {
    high_positive: 0.7,
    high_negative: -0.7,
    extreme_emotion: 0.8,
    emotion_spike: 0.5, // Change in emotion
  };

  /**
   * Initialize the sentiment oracle
   */
  async init(hub: IEventHub): Promise<void> {
    this.hub = hub;
    
    console.log('🔮 Awakening the Sentiment Oracle...');
    
    try {
      // Initialize sentiment analyzer
      this.sentimentAnalyzer = new Sentiment();
      
      // Load custom emotional lexicon for séance context
      this.loadSpectralLexicon();
      
      // Try to load TensorFlow model (optional enhancement)
      await this.loadTensorFlowModel();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      
      hub.emit({
        type: 'sentiment_oracle_initialized',
        source: this.id,
        timestamp: Date.now(),
        data: { 
          message: 'The Sentiment Oracle sees all emotions',
          hasTensorFlow: !!this.tfModel,
        },
        metadata: {
          haunted: true,
          intensity: 0.4,
        },
      });
      
      console.log('👁️ Sentiment Oracle is now watching emotions');
    } catch (error) {
      console.error('Failed to awaken Sentiment Oracle:', error);
      throw error;
    }
  }

  /**
   * Process spectral events for sentiment analysis
   */
  process(event: SpectralEvent): Observable<SpectralEvent> {
    if (!this.isInitialized || !this.hub) {
      return EMPTY;
    }

    switch (event.type) {
      case 'seance_message':
        return this.analyzeSentiment(event);
      
      case 'participant_joined_seance':
        return this.initializeParticipantEmotion(event);
      
      case 'audio_intensity_detected':
        return this.analyzeAudioEmotion(event);
      
      default:
        return EMPTY;
    }
  }

  /**
   * Manifest emotional haunts based on accumulated sentiment
   */
  haunt(): Observable<SpectralEvent> {
    if (!this.isInitialized) {
      return EMPTY;
    }

    return new Observable(observer => {
      // Check for sessions with high emotional activity
      for (const [sessionId, sessionState] of this.sessionEmotions) {
        const emotionalIntensity = this.calculateEmotionalIntensity(sessionState);
        
        if (emotionalIntensity > 0.6 && Math.random() < 0.3) {
          const dominantEmotion = this.getDominantEmotion(sessionState);
          
          observer.next({
            type: 'emotional_haunt_triggered',
            source: this.id,
            timestamp: Date.now(),
            data: {
              sessionId,
              dominantEmotion,
              intensity: emotionalIntensity,
              message: this.generateEmotionalMessage(dominantEmotion, emotionalIntensity),
            },
            metadata: {
              haunted: true,
              intensity: emotionalIntensity,
            },
          });
        }
      }
      
      observer.complete();
    });
  }

  /**
   * Clean up sentiment analysis resources
   */
  teardown(): void {
    console.log('🌫️ The Sentiment Oracle closes its ethereal eyes...');
    
    this.emotionHistory.clear();
    this.sessionEmotions.clear();
    this.isInitialized = false;
    
    if (this.tfModel) {
      this.tfModel.dispose();
    }
    
    if (this.hub) {
      this.hub.emit({
        type: 'sentiment_oracle_teardown',
        source: this.id,
        timestamp: Date.now(),
        data: { message: 'The Sentiment Oracle has withdrawn from the emotional realm' },
        metadata: {
          haunted: true,
          intensity: 0.2,
        },
      });
    }
  }

  /**
   * Check for emotional disturbances
   */
  manifest_disturbance(): boolean {
    // Check for participants with extreme emotional states
    const extremeEmotions = Array.from(this.emotionHistory.values())
      .filter(profile => Math.abs(profile.currentSentiment) > 0.9);
    
    // Check for sessions with chaotic emotional patterns
    const chaoticSessions = Array.from(this.sessionEmotions.values())
      .filter(session => session.emotionalVolatility > 0.8);
    
    return extremeEmotions.length > 0 || chaoticSessions.length > 0;
  }

  /**
   * Load spectral lexicon for séance-specific sentiment analysis
   */
  private loadSpectralLexicon(): void {
    const spectralWords = {
      // Positive spectral terms
      'spirit': 2,
      'ethereal': 2,
      'mystical': 2,
      'enlightened': 3,
      'transcendent': 3,
      'peaceful': 2,
      'serene': 2,
      'blessed': 3,
      'divine': 3,
      'harmony': 2,
      
      // Negative spectral terms
      'haunted': -2,
      'cursed': -3,
      'tormented': -3,
      'banished': -2,
      'malevolent': -3,
      'sinister': -2,
      'ominous': -2,
      'dread': -3,
      'terror': -3,
      'nightmare': -3,
      
      // Neutral but intense spectral terms
      'manifestation': 1,
      'apparition': 0,
      'phantom': 0,
      'wraith': -1,
      'specter': -1,
      'poltergeist': -1,
      'séance': 1,
      'medium': 1,
      'channeling': 1,
      'otherworldly': 1,
    };
    
    // Register custom words with sentiment analyzer
    this.sentimentAnalyzer.registerLanguage('spectral', spectralWords);
  }

  /**
   * Load TensorFlow model for advanced emotion detection
   */
  private async loadTensorFlowModel(): Promise<void> {
    try {
      // In a real implementation, you would load a pre-trained emotion detection model
      // For this demo, we'll create a simple mock model structure
      console.log('🧠 Loading TensorFlow emotion model...');
      
      // Mock model - in production, load from URL or file
      // this.tfModel = await tf.loadLayersModel('path/to/emotion-model.json');
      
      console.log('⚠️ TensorFlow model loading skipped for demo - using rule-based analysis');
    } catch (error) {
      console.warn('Failed to load TensorFlow model, using basic sentiment analysis:', error);
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.hub) return;

    // Clean up old emotion data periodically
    setInterval(() => {
      this.cleanupOldEmotionData();
    }, 300000); // Every 5 minutes
  }

  /**
   * Analyze sentiment of séance message
   */
  private analyzeSentiment(event: SpectralEvent): Observable<SpectralEvent> {
    const { sessionId, message, participantId } = event.data;
    
    return new Observable(observer => {
      try {
        // Basic sentiment analysis
        const sentimentResult = this.sentimentAnalyzer.analyze(message);
        const normalizedScore = this.normalizeSentimentScore(sentimentResult.score, message.length);
        
        // Enhanced analysis with spectral context
        const spectralSentiment = this.analyzeSpectralContext(message, normalizedScore);
        
        // Update participant emotion profile
        this.updateParticipantEmotion(participantId, spectralSentiment, message);
        
        // Update session emotion state
        this.updateSessionEmotion(sessionId, participantId, spectralSentiment);
        
        // Determine emotion category
        const emotionCategory = this.categorizeEmotion(spectralSentiment);
        
        // Check for high emotion triggers
        const isHighEmotion = Math.abs(spectralSentiment.score) > this.emotionThresholds.high_positive;
        
        observer.next({
          type: 'sentiment_analysis',
          source: this.id,
          timestamp: Date.now(),
          data: {
            sessionId,
            participantId,
            message,
            sentiment: emotionCategory,
            score: spectralSentiment.score,
            confidence: spectralSentiment.confidence,
            spectralWords: spectralSentiment.spectralWords,
            isHighEmotion,
          },
          metadata: {
            haunted: isHighEmotion,
            intensity: Math.abs(spectralSentiment.score),
          },
        });
        
        // Emit high emotion event if threshold exceeded
        if (isHighEmotion) {
          observer.next({
            type: 'high_emotion_detected',
            source: this.id,
            timestamp: Date.now(),
            data: {
              sessionId,
              participantId,
              sentiment: emotionCategory,
              score: spectralSentiment.score,
              message,
            },
            metadata: {
              haunted: true,
              intensity: Math.abs(spectralSentiment.score),
            },
          });
        }
        
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Initialize emotion tracking for new participant
   */
  private initializeParticipantEmotion(event: SpectralEvent): Observable<SpectralEvent> {
    const { sessionId, participantId, participantName } = event.data;
    
    const emotionProfile: EmotionProfile = {
      participantId,
      participantName,
      sessionId,
      currentSentiment: 0,
      emotionHistory: [],
      dominantEmotion: 'neutral',
      emotionalVolatility: 0,
      lastUpdate: Date.now(),
      messageCount: 0,
    };
    
    this.emotionHistory.set(participantId, emotionProfile);
    
    return of({
      type: 'participant_emotion_initialized',
      source: this.id,
      timestamp: Date.now(),
      data: { sessionId, participantId, participantName },
      metadata: {
        haunted: false,
        intensity: 0.1,
      },
    });
  }

  /**
   * Analyze audio-based emotion (placeholder for future audio ML integration)
   */
  private analyzeAudioEmotion(event: SpectralEvent): Observable<SpectralEvent> {
    const { participantId, audioIntensity, frequency } = event.data;
    
    // Simple heuristic: high intensity + high frequency = excitement/fear
    // Low intensity + low frequency = sadness/calm
    let emotionalScore = 0;
    
    if (audioIntensity > 0.7 && frequency > 1000) {
      emotionalScore = 0.6; // Excitement/fear
    } else if (audioIntensity < 0.3 && frequency < 500) {
      emotionalScore = -0.4; // Sadness/calm
    }
    
    if (Math.abs(emotionalScore) > 0.3) {
      return of({
        type: 'audio_emotion_detected',
        source: this.id,
        timestamp: Date.now(),
        data: {
          participantId,
          emotionalScore,
          audioIntensity,
          frequency,
        },
        metadata: {
          haunted: Math.abs(emotionalScore) > 0.5,
          intensity: Math.abs(emotionalScore),
        },
      });
    }
    
    return EMPTY;
  }

  /**
   * Normalize sentiment score based on message length and context
   */
  private normalizeSentimentScore(rawScore: number, messageLength: number): number {
    // Normalize by message length (longer messages can have higher absolute scores)
    const lengthFactor = Math.min(1.0, messageLength / 50); // Cap at 50 characters
    const normalizedScore = rawScore / Math.max(1, messageLength / 10);
    
    // Clamp to [-1, 1] range
    return Math.max(-1, Math.min(1, normalizedScore * lengthFactor));
  }

  /**
   * Analyze spectral context for enhanced sentiment
   */
  private analyzeSpectralContext(message: string, baseScore: number): SpectralSentiment {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);
    
    // Find spectral words
    const spectralWords: string[] = [];
    let spectralBonus = 0;
    
    const spectralTerms = [
      'spirit', 'ghost', 'phantom', 'apparition', 'haunt', 'séance', 'medium',
      'ethereal', 'otherworldly', 'supernatural', 'paranormal', 'mystical',
      'cursed', 'blessed', 'divine', 'demonic', 'angelic', 'sacred'
    ];
    
    words.forEach(word => {
      if (spectralTerms.includes(word)) {
        spectralWords.push(word);
        spectralBonus += 0.1; // Small boost for spectral context
      }
    });
    
    // Calculate confidence based on message characteristics
    const confidence = Math.min(1.0, 
      0.5 + // Base confidence
      (words.length / 20) * 0.3 + // Length factor
      (spectralWords.length / words.length) * 0.2 // Spectral relevance
    );
    
    return {
      score: Math.max(-1, Math.min(1, baseScore + spectralBonus)),
      confidence,
      spectralWords,
      rawScore: baseScore,
    };
  }

  /**
   * Update participant emotion profile
   */
  private updateParticipantEmotion(participantId: string, sentiment: SpectralSentiment, message: string): void {
    const profile = this.emotionHistory.get(participantId);
    if (!profile) return;
    
    // Update current sentiment with smoothing
    const smoothingFactor = 0.7;
    profile.currentSentiment = profile.currentSentiment * smoothingFactor + sentiment.score * (1 - smoothingFactor);
    
    // Add to emotion history
    profile.emotionHistory.push({
      score: sentiment.score,
      timestamp: Date.now(),
      message: message.substring(0, 100), // Store first 100 chars
    });
    
    // Keep only recent history (last 20 messages)
    if (profile.emotionHistory.length > 20) {
      profile.emotionHistory = profile.emotionHistory.slice(-20);
    }
    
    // Update dominant emotion
    profile.dominantEmotion = this.categorizeEmotion(sentiment);
    
    // Calculate emotional volatility (how much emotions change)
    if (profile.emotionHistory.length > 1) {
      const recentScores = profile.emotionHistory.slice(-5).map(h => h.score);
      const variance = this.calculateVariance(recentScores);
      profile.emotionalVolatility = Math.min(1.0, variance * 2);
    }
    
    profile.lastUpdate = Date.now();
    profile.messageCount++;
  }

  /**
   * Update session emotion state
   */
  private updateSessionEmotion(sessionId: string, participantId: string, sentiment: SpectralSentiment): void {
    if (!this.sessionEmotions.has(sessionId)) {
      this.sessionEmotions.set(sessionId, {
        sessionId,
        participantEmotions: new Map(),
        averageSentiment: 0,
        emotionalVolatility: 0,
        dominantEmotion: 'neutral',
        lastUpdate: Date.now(),
      });
    }
    
    const sessionState = this.sessionEmotions.get(sessionId)!;
    sessionState.participantEmotions.set(participantId, sentiment.score);
    
    // Calculate session average sentiment
    const scores = Array.from(sessionState.participantEmotions.values());
    sessionState.averageSentiment = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Calculate session emotional volatility
    sessionState.emotionalVolatility = this.calculateVariance(scores);
    
    // Update dominant emotion
    sessionState.dominantEmotion = this.categorizeEmotion({ score: sessionState.averageSentiment } as SpectralSentiment);
    sessionState.lastUpdate = Date.now();
  }

  /**
   * Categorize emotion based on sentiment score
   */
  private categorizeEmotion(sentiment: SpectralSentiment): EmotionCategory {
    const score = sentiment.score;
    
    if (score > 0.6) return 'joy';
    if (score > 0.2) return 'contentment';
    if (score < -0.6) return 'sadness';
    if (score < -0.2) return 'melancholy';
    if (Math.abs(score) < 0.1) return 'neutral';
    
    // Check for specific emotions based on spectral words
    if (sentiment.spectralWords) {
      const words = sentiment.spectralWords.join(' ');
      if (words.includes('fear') || words.includes('terror')) return 'fear';
      if (words.includes('anger') || words.includes('rage')) return 'anger';
      if (words.includes('surprise') || words.includes('shock')) return 'surprise';
    }
    
    return score > 0 ? 'contentment' : 'melancholy';
  }

  /**
   * Calculate emotional intensity for a session
   */
  private calculateEmotionalIntensity(sessionState: SessionEmotionState): number {
    const sentimentIntensity = Math.abs(sessionState.averageSentiment);
    const volatilityBonus = sessionState.emotionalVolatility * 0.3;
    const participantFactor = Math.min(1.0, sessionState.participantEmotions.size / 5);
    
    return Math.min(1.0, sentimentIntensity + volatilityBonus) * participantFactor;
  }

  /**
   * Get dominant emotion for a session
   */
  private getDominantEmotion(sessionState: SessionEmotionState): EmotionCategory {
    return sessionState.dominantEmotion;
  }

  /**
   * Generate emotional message for haunts
   */
  private generateEmotionalMessage(emotion: EmotionCategory, intensity: number): string {
    const messages = {
      joy: [
        "Your joy resonates through the ethereal realm...",
        "The spirits dance with your happiness...",
        "Such light pierces the veil between worlds...",
      ],
      sadness: [
        "Your sorrow calls to the melancholy spirits...",
        "Tears in the living world create ripples in ours...",
        "The weight of your sadness draws us near...",
      ],
      fear: [
        "Your fear feeds the shadows that lurk here...",
        "Terror opens doorways we thought were sealed...",
        "The darkness grows stronger with your dread...",
      ],
      anger: [
        "Your rage stirs the restless spirits...",
        "Fury burns bridges between the realms...",
        "The angry dead recognize a kindred soul...",
      ],
      neutral: [
        "The emotional currents shift and swirl...",
        "Balance in the living brings peace to the dead...",
        "Calm minds allow clearer spiritual communication...",
      ],
    };
    
    const emotionMessages = messages[emotion] || messages.neutral;
    const baseMessage = emotionMessages[Math.floor(Math.random() * emotionMessages.length)];
    
    // Add intensity modifier
    if (intensity > 0.8) {
      return `${baseMessage} The intensity is overwhelming!`;
    } else if (intensity > 0.6) {
      return `${baseMessage} The energy is strong...`;
    }
    
    return baseMessage;
  }

  /**
   * Calculate variance for emotional volatility
   */
  private calculateVariance(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
    
    return Math.sqrt(variance); // Return standard deviation
  }

  /**
   * Clean up old emotion data
   */
  private cleanupOldEmotionData(): void {
    const now = Date.now();
    const maxAge = 1800000; // 30 minutes
    
    // Clean up participant emotion history
    for (const [participantId, profile] of this.emotionHistory) {
      if (now - profile.lastUpdate > maxAge) {
        this.emotionHistory.delete(participantId);
      }
    }
    
    // Clean up session emotion states
    for (const [sessionId, sessionState] of this.sessionEmotions) {
      if (now - sessionState.lastUpdate > maxAge) {
        this.sessionEmotions.delete(sessionId);
      }
    }
  }
}

// Type definitions for sentiment analysis
interface SpectralSentiment {
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  spectralWords: string[];
  rawScore: number;
}

interface EmotionProfile {
  participantId: string;
  participantName: string;
  sessionId: string;
  currentSentiment: number;
  emotionHistory: EmotionHistoryEntry[];
  dominantEmotion: EmotionCategory;
  emotionalVolatility: number;
  lastUpdate: number;
  messageCount: number;
}

interface EmotionHistoryEntry {
  score: number;
  timestamp: number;
  message: string;
}

interface SessionEmotionState {
  sessionId: string;
  participantEmotions: Map<string, number>;
  averageSentiment: number;
  emotionalVolatility: number;
  dominantEmotion: EmotionCategory;
  lastUpdate: number;
}

type EmotionCategory = 'joy' | 'sadness' | 'fear' | 'anger' | 'surprise' | 'contentment' | 'melancholy' | 'neutral';