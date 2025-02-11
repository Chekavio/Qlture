import { Module } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { FollowersController } from './followers.controller';
import { FollowersRepository } from './followers.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follower } from './followers.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Follower]), UsersModule],
  controllers: [FollowersController],
  providers: [FollowersService, FollowersRepository],
  exports: [FollowersService],
})
export class FollowersModule {}
