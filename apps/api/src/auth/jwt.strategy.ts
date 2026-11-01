import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthRole } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'bigbites-dev-jwt-secret-change-in-production',
    });
  }

  validate(payload: { sub: string; email: string; name: string; role?: AuthRole }) {
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'customer',
    };
  }
}
