import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ExtractJwt } from 'passport-jwt';
import { TokenService } from '../services/token.service';
import { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private tokenService: TokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('>>> [DEBUG] JwtAuthGuard called (route =', context.switchToHttp().getRequest().url, ')');
    console.log('JwtAuthGuard called');
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('[DEBUG JwtAuthGuard] isPublic:', isPublic, 'handler:', context.getHandler().name, 'class:', context.getClass().name, 'url:', context.switchToHttp().getRequest().url);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }

    try {
      // First try to verify the access token
      const payload = await this.tokenService.verifyAccessToken(token);
      request['user'] = payload;
      return true;
    } catch (error) {
      // If access token is expired, try to refresh using refresh token
      if (error?.message === 'Token expired') {
        const refreshToken = request.cookies['refresh_token'];

        if (!refreshToken) {
          throw new UnauthorizedException('Refresh token not found');
        }

        try {
          // Get new access token
          const newAccessToken =
            await this.tokenService.refreshAccessToken(refreshToken);

          // Set the new access token in the response header
          response.setHeader('New-Access-Token', newAccessToken);

          // Update request with new token for this request
          request.headers.authorization = `Bearer ${newAccessToken}`;

          // Verify the new token and set user
          const newPayload =
            await this.tokenService.verifyAccessToken(newAccessToken);
          request['user'] = newPayload;

          return true;
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          throw new UnauthorizedException('Failed to refresh token');
        }
      }

      throw new UnauthorizedException('Invalid token');
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('No authentication token provided');
      }
      if (info?.message === 'jwt malformed') {
        throw new UnauthorizedException('Invalid token format');
      }
      throw err || new UnauthorizedException('Authentication failed');
    }

    return user;
  }
}
