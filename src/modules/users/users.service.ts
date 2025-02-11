import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './dto'; // ✅ Ajout de l'import

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto) {
    return this.usersRepository.createUser(createUserDto);
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.updateUser(userId, updateUserDto);
  }
}
