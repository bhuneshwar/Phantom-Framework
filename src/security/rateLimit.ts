import { Request, Response, NextFunction } from 'express';
import { SpectralError, SpectralErrorType } from '../core/types';

/**
 * Banishment Shield - Rate limiting middleware to prevent spectral overload
 * Protects the realm from excessive requests and malicious spirits
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
  allowHauntedBypass?: boolean; // Allow haunted users to bypass limits
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  remainingRequests: number;
  resetTime: Date;
  isBlocked: boolean;
  hauntLevel: number;
}

/**
 * Rate limiter service with spectral tracking
 */
export class RateLimiter {
  private readonly requests = new Map<string, number[]>(); // key -> timestamps
  private readonly blockedSpirits = new Map<string, number>(); // key -> block end time
  private readonly hauntLevels = new Map<string, number>(); // key -> haunt intensity
  private readonly config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: this.defaultKeyGenerator,
      onLimitReached: this.defaultLimitHandler,
      allowHauntedBypass: false,
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * Check if request should be allowed
   */
  isAllowed(key: string, isHaunted: boolean = false): RateLimitInfo {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Check if spirit is currently blocked
    const blockEndTime = this.blockedSpirits.get(key);
    if (blockEndTime && now < blockEndTime) {
      return {
        totalHits: this.getTotalHits(key),
        totalHitsInWindow: this.getWindowHits(key, windowStart),
        remainingRequests: 0,
        resetTime: new Date(blockEndTime),
        isBlocked: true,
        hauntLevel: this.hauntLevels.get(key) || 0,
      };
    }

    // Get request timestamps for this key
    const timestamps = this.requests.get(key) || [];
    
    // Filter to current window
    const windowHits = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Check haunted bypass
    if (isHaunted && this.config.allowHauntedBypass) {
      const hauntLevel = this.hauntLevels.get(key) || 0;
      const bonusRequests = Math.floor(hauntLevel * this.config.maxRequests * 0.5);
      const effectiveLimit = this.config.maxRequests + bonusRequests;
      
      if (windowHits.length < effectiveLimit) {
        return {
          totalHits: timestamps.length,
          totalHitsInWindow: windowHits.length,
          remainingRequests: effectiveLimit - windowHits.length,
          resetTime: new Date(now + this.config.windowMs),
          isBlocked: false,
          hauntLevel,
        };
      }
    }

    // Standard rate limit check
    const isBlocked = windowHits.length >= this.config.maxRequests;
    
    if (isBlocked) {
      // Increase haunt level for blocked spirits
      this.increaseHauntLevel(key);
      
      // Block for additional time based on haunt level
      const hauntLevel = this.hauntLevels.get(key) || 0;
      const blockDuration = this.config.windowMs * (1 + hauntLevel);
      this.blockedSpirits.set(key, now + blockDuration);
    }

    return {
      totalHits: timestamps.length,
      totalHitsInWindow: windowHits.length,
      remainingRequests: Math.max(0, this.config.maxRequests - windowHits.length),
      resetTime: new Date(now + this.config.windowMs),
      isBlocked,
      hauntLevel: this.hauntLevels.get(key) || 0,
    };
  }

  /**
   * Record a request for the given key
   */
  recordRequest(key: string, success: boolean = true): void {
    // Skip recording based on config
    if ((success && this.config.skipSuccessfulRequests) ||
        (!success && this.config.skipFailedRequests)) {
      return;
    }

    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    timestamps.push(now);
    this.requests.set(key, timestamps);

    // Increase haunt level for failed requests
    if (!success) {
      this.increaseHauntLevel(key, 0.1);
    }
  }

  /**
   * Get rate limit info for a key
   */
  getInfo(key: string): RateLimitInfo {
    return this.isAllowed(key);
  }

  /**
   * Manually block a spirit (banishment)
   */
  banishSpirit(key: string, durationMs: number = this.config.windowMs * 2): void {
    const blockEndTime = Date.now() + durationMs;
    this.blockedSpirits.set(key, blockEndTime);
    this.increaseHauntLevel(key, 0.5);
  }

  /**
   * Remove block for a spirit (exorcism)
   */
  exorciseSpirit(key: string): void {
    this.blockedSpirits.delete(key);
    this.hauntLevels.delete(key);
  }

  /**
   * Get total hits for a key
   */
  private getTotalHits(key: string): number {
    return this.requests.get(key)?.length || 0;
  }

  /**
   * Get hits within current window
   */
  private getWindowHits(key: string, windowStart: number): number {
    const timestamps = this.requests.get(key) || [];
    return timestamps.filter(timestamp => timestamp > windowStart).length;
  }

  /**
   * Increase haunt level for a key
   */
  private increaseHauntLevel(key: string, amount: number = 0.05): void {
    const currentLevel = this.hauntLevels.get(key) || 0;
    const newLevel = Math.min(1.0, currentLevel + amount);
    this.hauntLevels.set(key, newLevel);
  }

  /**
   * Default key generator (IP-based)
   */
  private defaultKeyGenerator(req: Request): string {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Default limit reached handler
   */
  private defaultLimitHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too many requests from this spirit',
      message: 'The spectral realm is overwhelmed by your presence',
      haunted: true,
      banishment_duration: this.config.windowMs,
    });
  }

  /**
   * Start cleanup timer for old data
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.windowMs * 2; // Keep extra history

      // Clean old request timestamps
      for (const [key, timestamps] of this.requests) {
        const filtered = timestamps.filter(timestamp => timestamp > cutoff);
        
        if (filtered.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, filtered);
        }
      }

      // Clean expired blocks
      for (const [key, blockEndTime] of this.blockedSpirits) {
        if (now >= blockEndTime) {
          this.blockedSpirits.delete(key);
        }
      }

      // Decay haunt levels
      for (const [key, hauntLevel] of this.hauntLevels) {
        const decayedLevel = hauntLevel * 0.98; // 2% decay per cleanup
        
        if (decayedLevel < 0.01) {
          this.hauntLevels.delete(key);
        } else {
          this.hauntLevels.set(key, decayedLevel);
        }
      }
    }, 60000); // Cleanup every minute
  }
}

/**
 * Create Express middleware for rate limiting
 * Standard configuration: 100 requests per 15 minutes
 */
export function createRateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const rateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    ...config,
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = rateLimiter['config'].keyGenerator(req);
    const user = (req as any).user;
    const isHaunted = user?.haunted || false;
    
    const limitInfo = rateLimiter.isAllowed(key, isHaunted);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
      'X-RateLimit-Remaining': limitInfo.remainingRequests.toString(),
      'X-RateLimit-Reset': limitInfo.resetTime.toISOString(),
      'X-Spectral-Haunt-Level': limitInfo.hauntLevel.toFixed(2),
    });

    if (limitInfo.isBlocked) {
      rateLimiter['config'].onLimitReached(req, res);
      return;
    }

    // Record the request
    rateLimiter.recordRequest(key);
    
    // Add rate limit info to response locals for debugging
    res.locals.rateLimit = limitInfo;
    
    next();
  };
}

/**
 * Create stricter rate limiter for sensitive endpoints
 */
export function createStrictRateLimitMiddleware() {
  return createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // Much stricter
    allowHauntedBypass: false, // No bypass for sensitive operations
  });
}

/**
 * Create lenient rate limiter for public endpoints
 */
export function createLenientRateLimitMiddleware() {
  return createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // More generous
    allowHauntedBypass: true, // Allow haunted users more requests
    skipSuccessfulRequests: true, // Only count failed requests
  });
}

/**
 * User-based rate limiting (requires authentication)
 */
export function createUserRateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const rateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 200, // Higher limit for authenticated users
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user ? `user:${user.id}` : req.ip || 'anonymous';
    },
    allowHauntedBypass: true,
    ...config,
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = rateLimiter['config'].keyGenerator(req);
    const user = (req as any).user;
    const isHaunted = user?.haunted || false;
    
    const limitInfo = rateLimiter.isAllowed(key, isHaunted);
    
    // Enhanced headers for user-based limiting
    res.set({
      'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
      'X-RateLimit-Remaining': limitInfo.remainingRequests.toString(),
      'X-RateLimit-Reset': limitInfo.resetTime.toISOString(),
      'X-Spectral-Haunt-Level': limitInfo.hauntLevel.toFixed(2),
      'X-RateLimit-Type': user ? 'user' : 'ip',
    });

    if (limitInfo.isBlocked) {
      res.status(429).json({
        error: 'User request limit exceeded',
        message: 'Your spectral essence is overwhelming the realm',
        haunted: true,
        userId: user?.id,
        resetTime: limitInfo.resetTime,
      });
      return;
    }

    rateLimiter.recordRequest(key);
    res.locals.rateLimit = limitInfo;
    
    next();
  };
}