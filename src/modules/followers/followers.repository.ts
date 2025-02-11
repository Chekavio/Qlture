import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follower } from './followers.entity';

@Injectable()
export class FollowersRepository {
  constructor(@InjectRepository(Follower) private followersRepo: Repository<Follower>) {}

  async followUser(follower_id: string, following_id: string): Promise<Follower> {
    const follow = this.followersRepo.create({ follower_id, following_id });
    return this.followersRepo.save(follow);
  }

  async unfollowUser(follower_id: string, following_id: string): Promise<void> {
    await this.followersRepo.delete({ follower_id, following_id });
  }

  async getFollowers(userId: string): Promise<Follower[]> {
    return this.followersRepo.find({ where: { following_id: userId } });
  }

  async getFollowing(userId: string): Promise<Follower[]> {
    return this.followersRepo.find({ where: { follower_id: userId } });
  }

  async countFollowers(userId: string): Promise<number> {
    return this.followersRepo.count({ where: { following_id: userId } });
  }

  async countFollowing(userId: string): Promise<number> {
    return this.followersRepo.count({ where: { follower_id: userId } });
  }
}
