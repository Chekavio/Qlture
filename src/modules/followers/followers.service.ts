import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import * as crypto from 'crypto';

@Injectable()
export class FollowersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async followUser(followerId: string | any, followingId: string) {
    // Si followerId est un objet JWT, extraire l'ID
    const followerUserId = typeof followerId === 'object' ? followerId.sub : followerId;

    // Vérifier que les deux utilisateurs existent
    await Promise.all([
      this.userService.findById(followerUserId),
      this.userService.findById(followingId),
    ]);

    // Vérifier qu'un utilisateur n'essaie pas de se suivre lui-même
    if (followerUserId === followingId) {
      throw new ConflictException('Cannot follow yourself');
    }

    try {
      return await this.prisma.follower.create({
        data: {
          id: crypto.randomUUID(),
          followerId: followerUserId,
          followingId,
        },
        include: {
          User_Follower_followerIdToUser: true,
          User_Follower_followingIdToUser: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Already following this user');
      }
      throw error;
    }
  }

  async unfollowUser(followerId: string | any, followingId: string) {
    // Si followerId est un objet JWT, extraire l'ID
    const followerUserId = typeof followerId === 'object' ? followerId.sub : followerId;

    const follower = await this.prisma.follower.findFirst({
      where: {
        followerId: followerUserId,
        followingId,
      },
    });

    if (!follower) {
      throw new NotFoundException('Follower relationship not found');
    }

    return this.prisma.follower.delete({
      where: {
        id: follower.id,
      },
    });
  }

  async getFollowers(userId: any) {
    // Si userId est un objet JWT, extraire l'ID
    const targetUserId = typeof userId === 'object' ? userId.sub : userId;

    const followers = await this.prisma.follower.findMany({
      where: {
        followingId: targetUserId,
      },
      include: {
        User_Follower_followerIdToUser: true,
      },
    });

    return followers.map((follower) => follower.User_Follower_followerIdToUser);
  }

  async getFollowing(userId: any) {
    // Si userId est un objet JWT, extraire l'ID
    const targetUserId = typeof userId === 'object' ? userId.sub : userId;

    const following = await this.prisma.follower.findMany({
      where: {
        followerId: targetUserId,
      },
      include: {
        User_Follower_followingIdToUser: true,
      },
    });

    return following.map((follow) => follow.User_Follower_followingIdToUser);
  }

  async getFollowersCount(userId: string): Promise<number> {
    return this.prisma.follower.count({
      where: {
        followingId: userId,
      },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.prisma.follower.count({
      where: {
        followerId: userId,
      },
    });
  }

  async isFollowing(followerId: string | any, targetUserId: string): Promise<boolean> {
    // Si followerId est un objet JWT, extraire l'ID
    const followerUserId = typeof followerId === 'object' ? followerId.sub : followerId;

    const count = await this.prisma.follower.count({
      where: {
        followerId: followerUserId,
        followingId: targetUserId,
      },
    });
    return count > 0;
  }
}
