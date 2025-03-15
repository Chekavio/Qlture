import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { IUser, IUserWithPassword } from '../../common/interfaces/user.interface';
import { User } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private mapToIUser(user: User | null): IUser | null {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      avatar: user.avatar || undefined,
      provider: user.provider || undefined,
      providerId: user.providerId || undefined,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToIUserWithPassword(user: User | null): IUserWithPassword | null {
    if (!user) return null;
    
    return {
      ...this.mapToIUser(user)!,
      password: user.password || undefined,
    };
  }

  async create(createUserDto: CreateUserDto): Promise<IUser> {
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        ...createUserDto,
        lastLogin: now,
        updatedAt: now,
      },
    });
    return this.mapToIUser(user)!;
  }

  async findAll(): Promise<IUser[]> {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.mapToIUser(user)!);
  }

  async findById(id: string): Promise<IUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToIUser(user)!;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return this.mapToIUser(user);
  }

  async findByEmailForAuth(email: string): Promise<IUserWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return this.mapToIUserWithPassword(user);
  }

  async findByUsername(username: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    return this.mapToIUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    const { password, ...userData } = updateUserDto;

    const updateData: any = { ...userData };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    return this.mapToIUser(user)!;
  }

  async remove(id: string): Promise<IUser> {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    return this.mapToIUser(user)!;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async updatePassword(id: string, password: string): Promise<IUser> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return this.mapToIUser(user)!;
  }

  async verifyEmail(id: string): Promise<IUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isEmailVerified: true },
    });
    return this.mapToIUser(user)!;
  }
}