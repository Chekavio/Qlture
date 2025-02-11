import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
  ) {}

  // 🔹 Récupérer le profil utilisateur en base
  async getUserProfile(auth0_id: string) {
    return this.authRepository.findUserByAuth0Id(auth0_id);
  }

  // 🔹 Vérifier le token et enregistrer l'utilisateur en base si besoin
  async registerUser(accessToken: string) {
    try {
      const userInfo = await this.getUserInfoFromAuth0(accessToken);

      let user = await this.authRepository.findUserByAuth0Id(userInfo.sub);
      if (!user) {
        user = await this.usersService.createUser({
          auth0_id: userInfo.sub,
          username: userInfo.nickname,
          email: userInfo.email,
          avatar_url: userInfo.picture,
        });
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // 🔹 Récupérer les infos utilisateur depuis Auth0
  async getUserInfoFromAuth0(accessToken: string) {
    const url = `https://${process.env.AUTH0_DOMAIN}/userinfo`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }
}
