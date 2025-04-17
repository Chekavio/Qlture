import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdateDescriptionDto, UpdateUsernameDto, UpdateProfileDto } from './dto';
import { IUser, IUserWithPassword } from '../../common/interfaces/user.interface';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Prisma, User } from '@prisma/client';
import { S3Service } from './s3.service';

@Injectable()
export class UserService {
  // Only allow basic Latin letters, numbers, underscore, hyphen
  private readonly USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  private readonly USERNAME_MAX_LENGTH = 20;
  private readonly USERNAME_MIN_LENGTH = 3;

  // List of reserved usernames that could be used for phishing or confusion
  private readonly RESERVED_USERNAMES = new Set([
    // System and admin-related
    'admin', 'administrator', 'system', 'root', 'superuser',
    'mod', 'moderator', 'staff', 'support', 'help',
    // Auth-related
    'login', 'signin', 'signup', 'register', 'auth',
    'password', 'account', 'user', 'username',
    // Common web terms
    'api', 'app', 'web', 'www', 'host',
    // Brand protection
    'qlture', 'qulture', 'qltur',
    // Common scam keywords
    'official', 'verify', 'verified', 'security',
    // Special system usernames
    'null', 'undefined', 'true', 'false', 'nan',
    // Common endpoints
    'profile', 'settings', 'home', 'dashboard'
  ]);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}
  

  private mapToIUser(user: User | null): IUser | null {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      description: user.description || undefined,
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

  private validateUsername(username: string): void {
    // Convert to lowercase for checks
    const lowerUsername = username.toLowerCase();

    if (username.length < this.USERNAME_MIN_LENGTH) {
      throw new BadRequestException(`Username must be at least ${this.USERNAME_MIN_LENGTH} characters long`);
    }
    if (username.length > this.USERNAME_MAX_LENGTH) {
      throw new BadRequestException(`Username must not exceed ${this.USERNAME_MAX_LENGTH} characters`);
    }
    if (!this.USERNAME_REGEX.test(username)) {
      throw new BadRequestException('Username must start with a letter and can only contain letters, numbers, underscores, and hyphens');
    }
    if (this.RESERVED_USERNAMES.has(lowerUsername)) {
      throw new BadRequestException('This username is reserved and cannot be used');
    }
    // Check for repeating characters (like 'aaaaaa')
    if (/(.)\1{4,}/.test(username)) {
      throw new BadRequestException('Username cannot contain more than 4 repeating characters');
    }
    // Check for common confusing patterns
    if (/^(admin|mod|support|help|system).*[0-9_-]/.test(lowerUsername)) {
      throw new BadRequestException('Username cannot mimic system or staff accounts');
    }
  }

  private async checkUsernameAvailability(username: string, excludeUserId?: string): Promise<void> {
    const lowerUsername = username.toLowerCase();
    const existingUser = await this.prisma.user.findFirst({
      where: {
        username: { equals: lowerUsername, mode: 'insensitive' },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      }
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<IUser> {
    // Validate username format
    this.validateUsername(createUserDto.username);
    
    // Check username availability
    await this.checkUsernameAvailability(createUserDto.username);

    const { password, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        ...userData,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: false,
        lastLogin: now,
        createdAt: now,
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

  async getUserBasicInfo(id: string): Promise<Pick<IUser, 'username' | 'avatar'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        username: true,
        avatar: true
      }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      username: user.username,
      avatar: user.avatar || undefined
    };
  }

  async updateDescription(id: string, description: string): Promise<IUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { 
        description,
        updatedAt: new Date()
      }
    });
    return this.mapToIUser(user)!;
  }

  async updateUsername(userId: string, username: string): Promise<IUser> {
    // Validate username format
    this.validateUsername(username);

    // Check username availability (excluding current user)
    await this.checkUsernameAvailability(username, userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username,
        updatedAt: new Date()
      }
    });

    return this.mapToIUser(updatedUser)!;
  }

  async updateAvatar(userId: string, file: Express.Multer.File): Promise<IUser> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete old avatar if present
    if (user.avatar?.includes('s3')) {
      const key = user.avatar.split('.amazonaws.com/')[1];
      if (key) await this.s3Service.deleteObject(key);
    }
  
    const avatarUrl = await this.s3Service.uploadUserAvatar(file, userId);
  
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
        updatedAt: new Date()
      }
    });

    return this.mapToIUser(updatedUser)!;
  }

  async updateProfile(
    id: string, 
    updateData: UpdateProfileDto,
    file?: Express.Multer.File
  ): Promise<IUser> {
    if (updateData.username) {
      // Validate username format
      this.validateUsername(updateData.username);

      // Check username availability (excluding current user)
      await this.checkUsernameAvailability(updateData.username, id);
    }

    // First update profile data
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      } as Prisma.UserUpdateInput
    });

    // Then update avatar if provided
    if (file) {
      const avatarUrl = await this.s3Service.uploadUserAvatar(file, id);
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          avatar: avatarUrl,
          updatedAt: new Date()
        }
      });
      return this.mapToIUser(updatedUser)!;
    }

    return this.mapToIUser(user)!;
  }
}