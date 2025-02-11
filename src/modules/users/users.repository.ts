import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  // 🔹 Trouver un utilisateur par ID
  async findUserById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  // 🔹 Créer un utilisateur (AJOUT DE LA MÉTHODE)
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepo.create(createUserDto);
    return this.usersRepo.save(user);
  }

  // 🔹 Mettre à jour un utilisateur
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    await this.usersRepo.update(userId, updateUserDto);
    return this.findUserById(userId);
  }
}
