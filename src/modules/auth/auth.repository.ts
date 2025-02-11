import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';

@Injectable()
export class AuthRepository {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  // 🔹 Trouver un utilisateur via son Auth0 ID
  async findUserByAuth0Id(auth0_id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { auth0_id } });
  }
}
