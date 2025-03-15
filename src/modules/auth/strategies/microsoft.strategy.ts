import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('MICROSOFT_CLIENT_ID');
    const clientSecret = configService.get<string>('MICROSOFT_CLIENT_SECRET');
    const callbackURL = configService.get<string>('MICROSOFT_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Missing Microsoft OAuth configuration');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user.read', 'openid', 'profile', 'email'],
      tenant: 'common',
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    return this.authService.validateOAuthUser(profile, 'microsoft');
  }
}
