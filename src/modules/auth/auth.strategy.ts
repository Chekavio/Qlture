import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class AuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    if (!process.env.AUTH0_CLIENT_SECRET) {
      throw new Error('AUTH0_CLIENT_SECRET must be defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.AUTH0_CLIENT_SECRET,
    });
  }

  async validate(payload: any) {
    return this.authService.getUserProfile(payload.sub);
  }
}
