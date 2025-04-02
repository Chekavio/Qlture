import {
  Injectable,
  ExecutionContext,
  CanActivate,
} from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';
import { TokenService } from '../services/token.service';
import { Request } from 'express';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('[DEBUG] OptionalJwtAuthGuard.canActivate called');
    
    const request = context.switchToHttp().getRequest<Request>();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    console.log('[DEBUG] Request headers:', request.headers);
    console.log('[DEBUG] Token found:', token);
    console.log('[DEBUG] Authorization header:', request.headers.authorization);

    if (!token) {
      console.log('[DEBUG] No token found, setting user to undefined');
      request['user'] = undefined;
      return true;
    }

    try {
      // First verify the token
      const payload = await this.tokenService.verifyAccessToken(token);
      console.log('[DEBUG] Token payload:', JSON.stringify(payload, null, 2));
      
      // Call validate directly from the JWT strategy
      const user = await this.jwtStrategy.validate(payload);
      console.log('[DEBUG] Validated user:', JSON.stringify(user, null, 2));
      
      // Set the validated user on the request with the sub property
      request['user'] = {
        ...user,
        sub: payload.sub  // Important: add the sub property for @CurrentUser('sub')
      };
      console.log('[DEBUG] Final user object:', JSON.stringify(request['user'], null, 2));
      
      return true;
    } catch (error) {
      console.warn('[OptionalJwtAuthGuard] Invalid token:', error?.message);
      request['user'] = undefined;
      return true;
    }
  }
}