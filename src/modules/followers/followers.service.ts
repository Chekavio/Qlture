import { Injectable } from '@nestjs/common';
import { FollowersRepository } from './followers.repository';
import { UsersService } from '../users/users.service';

@Injectable()
export class FollowersService {
  constructor(
    private readonly followersRepository: FollowersRepository,
    private readonly usersService: UsersService
  ) {}

  async followUser(follower_id: string, following_id: string) {
    return this.followersRepository.followUser(follower_id, following_id);
  }

  async unfollowUser(follower_id: string, following_id: string) {
    return this.followersRepository.unfollowUser(follower_id, following_id);
  }

  async getFollowers(userId: string) {
    return this.followersRepository.getFollowers(userId);
  }

  async getFollowing(userId: string) {
    return this.followersRepository.getFollowing(userId);
  }

  async countFollowers(userId: string) {
    return this.followersRepository.countFollowers(userId);
  }

  async countFollowing(userId: string) {
    return this.followersRepository.countFollowing(userId);
  }
}
