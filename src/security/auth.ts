import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { SpectralError, SpectralErrorType } from '../core/types';

/**
 * Spirit Verification - JWT-based authentication for the spectral realm
 * Manages user tokens and session security with haunted validation
 */

export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SPIRIT_GUIDE = 'spirit_guide', // Special role for AI haunts
}

export interface UserClaims {
  id: string;
  username: string;
  role: Role;
  permissions: string[];
  spectral_level: number; // 0-1 scale of supernatural access
  haunted: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
  refreshSecret: string;
  refreshExpiry: string;
  allowHauntedTokens: boolean;
}

/**
 * Authentication service for spirit verification
 */
export class AuthService {
  private readonly config: AuthConfig;
  private readonly blacklistedTokens = new Set<string>();
  private readonly hauntedSessions = new Map<string, number>(); // userId -> haunt level

  constructor(config: AuthConfig) {
    this.config = config;
    this.startTokenCleanup();
  }

  /**
   * Verify JWT token and extract user claims
   * Validates the spiritual essence of the token bearer
   */
  async verify(token: string): Promise<UserClaims> {
    try {
      // Check if token is blacklisted (banished)
      if (this.blacklistedTokens.has(token)) {
        throw this.createSpectralError(
          SpectralErrorType.BANISHMENT_REQUIRED,
          'Token has been banished from the spectral realm',
          'AuthService'
        );
      }

      // Verify token signature
      const decoded = jwt.verify(token, this.config.jwtSecret) as UserClaims;
      
      // Validate required claims
      if (!decoded.id || !decoded.username || !decoded.role) {
        throw new Error('Invalid token claims - missing required fields');
      }

      // Check if user session is haunted
      const hauntLevel = this.hauntedSessions.get(decoded.id) || 0;
      if (hauntLevel > 0.8 && !this.config.allowHauntedTokens) {
        throw this.createSpectralError(
          SpectralErrorType.DISTURBANCE_DETECTED,
          'User session is too heavily haunted for access',
          'AuthService'
        );
      }

      // Update haunted status
      decoded.haunted = hauntLevel > 0.3;
      decoded.spectral_level = Math.min(1.0, decoded.spectral_level + hauntLevel * 0.1);

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw this.createSpectralError(
          SpectralErrorType.BANISHMENT_REQUIRED,
          `Invalid spirit token: ${error.message}`,
          'AuthService'
        );
      }
      throw error;
    }
  }

  /**
   * Generate JWT token for authenticated user
   * Imbues the token with spectral essence
   */
  generateToken(user: Omit<UserClaims, 'iat' | 'exp'>): string {
    const payload: UserClaims = {
      ...user,
      iat: Math.floor(Date.now() / 1000),
    };

    // Add spooky claims for high-level users
    if (user.role === Role.ADMIN || user.role === Role.SPIRIT_GUIDE) {
      payload.spectral_level = Math.min(1.0, payload.spectral_level + 0.2);
    }

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiry,
      issuer: 'phantom-framework',
      audience: 'spectral-realm',
    });
  }

  /**
   * Generate refresh token for session renewal
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.config.refreshSecret, {
      expiresIn: this.config.refreshExpiry,
      issuer: 'phantom-framework',
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.refreshSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }

      // Here you would typically fetch user data from database
      // For demo purposes, we'll create a basic user
      const user: Omit<UserClaims, 'iat' | 'exp'> = {
        id: decoded.userId,
        username: `user_${decoded.userId}`,
        role: Role.USER,
        permissions: ['read', 'write'],
        spectral_level: 0.5,
        haunted: false,
      };

      return this.generateToken(user);
    } catch (error) {
      throw this.createSpectralError(
        SpectralErrorType.BANISHMENT_REQUIRED,
        `Refresh token verification failed: ${(error as Error).message}`,
        'AuthService'
      );
    }
  }

  /**
   * Validate user role against required role
   */
  validateRole(user: UserClaims, requiredRole: Role): boolean {
    const roleHierarchy = {
      [Role.USER]: 0,
      [Role.MODERATOR]: 1,
      [Role.ADMIN]: 2,
      [Role.SPIRIT_GUIDE]: 3,
    };

    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: UserClaims, permission: string): boolean {
    return user.permissions.includes(permission) || user.role === Role.ADMIN;
  }

  /**
   * Blacklist (banish) a token
   */
  banishToken(token: string): void {
    this.blacklistedTokens.add(token);
  }

  /**
   * Increase haunt level for a user session
   */
  hauntUser(userId: string, intensity: number = 0.1): void {
    const currentLevel = this.hauntedSessions.get(userId) || 0;
    const newLevel = Math.min(1.0, currentLevel + intensity);
    this.hauntedSessions.set(userId, newLevel);
  }

  /**
   * Reduce haunt level for a user session
   */
  exorciseUser(userId: string, reduction: number = 0.2): void {
    const currentLevel = this.hauntedSessions.get(userId) || 0;
    const newLevel = Math.max(0, currentLevel - reduction);
    
    if (newLevel === 0) {
      this.hauntedSessions.delete(userId);
    } else {
      this.hauntedSessions.set(userId, newLevel);
    }
  }

  /**
   * Start periodic cleanup of expired tokens and haunted sessions
   */
  private startTokenCleanup(): void {
    setInterval(() => {
      // Decay haunted sessions over time
      for (const [userId, hauntLevel] of this.hauntedSessions) {
        const decayedLevel = hauntLevel * 0.95; // 5% decay per interval
        
        if (decayedLevel < 0.05) {
          this.hauntedSessions.delete(userId);
        } else {
          this.hauntedSessions.set(userId, decayedLevel);
        }
      }

      // Clear old blacklisted tokens (simple cleanup - in production use Redis with TTL)
      if (this.blacklistedTokens.size > 10000) {
        this.blacklistedTokens.clear();
      }
    }, 60000); // Run every minute
  }

  /**
   * Create spectral error with proper typing
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
    error.haunt_level = 0.6;
    error.recovery_possible = type !== SpectralErrorType.REALM_COLLAPSE;
    
    return error;
  }
}

/**
 * Express middleware for JWT authentication
 * Guards routes from unauthorized spirits
 */
export function authenticateSpirit(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'No spirit token provided',
          message: 'Access to the spectral realm requires proper authentication',
          haunted: true,
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const user = await authService.verify(token);
      
      // Attach user to request for downstream middleware
      (req as any).user = user;
      (req as any).spectralLevel = user.spectral_level;
      (req as any).isHaunted = user.haunted;

      next();
    } catch (error) {
      const spectralError = error as SpectralError;
      
      res.status(401).json({
        error: 'Spirit verification failed',
        message: spectralError.message,
        type: spectralError.type,
        haunted: true,
        recovery_possible: spectralError.recovery_possible,
      });
    }
  };
}

/**
 * Express middleware for role-based authorization
 * Ensures only spirits of sufficient rank may pass
 */
export function requireRole(authService: AuthService, requiredRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserClaims;
    
    if (!user) {
      res.status(401).json({
        error: 'No authenticated spirit found',
        message: 'Authentication required before role validation',
        haunted: true,
      });
      return;
    }

    if (!authService.validateRole(user, requiredRole)) {
      res.status(403).json({
        error: 'Insufficient spectral authority',
        message: `Role ${requiredRole} or higher required`,
        userRole: user.role,
        haunted: true,
      });
      return;
    }

    next();
  };
}

/**
 * Express middleware for permission-based authorization
 */
export function requirePermission(authService: AuthService, permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserClaims;
    
    if (!user) {
      res.status(401).json({
        error: 'No authenticated spirit found',
        haunted: true,
      });
      return;
    }

    if (!authService.hasPermission(user, permission)) {
      res.status(403).json({
        error: 'Insufficient spectral permissions',
        message: `Permission '${permission}' required`,
        haunted: true,
      });
      return;
    }

    next();
  };
}