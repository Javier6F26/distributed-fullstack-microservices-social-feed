import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Strategy for validating access tokens.
 * Extracts JWT from Authorization header and validates it.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
    });
  }

  /**
   * Validate JWT payload and return user object.
   * Called automatically by Passport after JWT verification.
   * 
   * @param payload - Decoded JWT payload containing userId, email, etc.
   * @returns User object attached to request.user with guaranteed userId field
   */
  async validate(payload: any) {
    if (!payload.sub && !payload.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Always set userId - use userId if present, otherwise fall back to sub
    const userId = payload.userId || payload.sub;

    return {
      userId: userId, // Guaranteed to be set
      email: payload.email,
      username: payload.username,
    };
  }
}
