import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { TokenService } from '../services/token.service';
import { IUser } from '../../../common/interfaces/user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
    private tokenService: TokenService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<{ sub: string; email: string; username: string }>
  {
    try {
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User is inactive');
      }

      return {
        sub: user.id,
        email: user.email,
        username: user.username,
      };
    } catch (error) {
      console.error('JWT Strategy - Error:', error);
      throw new UnauthorizedException('Invalid token payload');
    }
  }
}
