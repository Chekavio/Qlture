import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { FollowDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '../users/users.entity';

@ApiTags('Followers')
@Controller('followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @ApiOperation({ summary: 'Suivre un utilisateur' })
  @ApiResponse({ 
    status: 201, 
    description: 'Utilisateur suivi avec succès',
    type: Boolean
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @Post()
  async followUser(@Body() followDto: FollowDto) {
    return this.followersService.followUser(followDto.follower_id, followDto.following_id);
  }

  @ApiOperation({ summary: 'Ne plus suivre un utilisateur' })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur plus suivi avec succès',
    type: Boolean
  })
  @ApiResponse({ status: 404, description: 'Relation de suivi non trouvée' })
  @Delete(':follower_id/:following_id')
  async unfollowUser(
    @Param('follower_id') follower_id: string,
    @Param('following_id') following_id: string
  ) {
    return this.followersService.unfollowUser(follower_id, following_id);
  }

  @ApiOperation({ summary: 'Obtenir la liste des followers d\'un utilisateur' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des followers récupérée avec succès',
    type: [User]
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @Get(':userId/followers')
  async getFollowers(@Param('userId') userId: string) {
    return this.followersService.getFollowers(userId);
  }

  @ApiOperation({ summary: 'Obtenir la liste des utilisateurs suivis' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des utilisateurs suivis récupérée avec succès',
    type: [User]
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @Get(':userId/following')
  async getFollowing(@Param('userId') userId: string) {
    return this.followersService.getFollowing(userId);
  }
}
