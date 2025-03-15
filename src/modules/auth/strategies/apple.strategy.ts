import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('APPLE_CLIENT_ID');
    const teamID = configService.get<string>('APPLE_TEAM_ID');
    const keyID = configService.get<string>('APPLE_KEY_ID');
    const keyPath = configService.get<string>('APPLE_PRIVATE_KEY_PATH');
    const callbackURL = configService.get<string>('APPLE_CALLBACK_URL');

    if (!clientID || !teamID || !keyID || !keyPath || !callbackURL) {
      throw new Error('Missing Apple OAuth configuration');
    }

    // Read the private key file
    const privateKeyString = fs.readFileSync(keyPath, 'utf8');

    super({
      clientID,
      teamID,
      keyID,
      privateKeyString,
      callbackURL,
      scope: ['email', 'name'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    return this.authService.validateOAuthUser(profile, 'apple');
  }
}
