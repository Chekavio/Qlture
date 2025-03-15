import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Param, 
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FollowersService } from './followers.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('followers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post(':targetUserId')
  @ApiOperation({ summary: 'Suivre un utilisateur' })
  @ApiParam({
    name: 'targetUserId',
    description: 'ID de l\'utilisateur à suivre',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Utilisateur suivi avec succès'
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'ID invalide' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Utilisateur non trouvé' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Déjà en train de suivre cet utilisateur' })
  async followUser(
    @CurrentUser('sub') userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.followUser(userId, targetUserId);
  }

  @Delete(':targetUserId')
  @ApiOperation({ summary: 'Ne plus suivre un utilisateur' })
  @ApiParam({
    name: 'targetUserId',
    description: 'ID de l\'utilisateur à ne plus suivre',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Utilisateur plus suivi avec succès'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Relation de suivi non trouvée' })
  async unfollowUser(
    @CurrentUser('sub') userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.unfollowUser(userId, targetUserId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Obtenir la liste des followers' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Liste des followers récupérée avec succès'
  })
  async getFollowers(@CurrentUser() user: any) {
    return this.followersService.getFollowers(user);
  }

  @Get('following')
  @ApiOperation({ summary: 'Obtenir la liste des utilisateurs suivis' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Liste des utilisateurs suivis récupérée avec succès'
  })
  async getFollowing(@CurrentUser() user: any) {
    return this.followersService.getFollowing(user);
  }

  @Get(':userId/followers/count')
  @ApiOperation({ summary: 'Obtenir le nombre de followers d\'un utilisateur' })
  @ApiParam({
    name: 'userId',
    description: 'ID de l\'utilisateur',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Nombre de followers récupéré avec succès'
  })
  async getFollowersCount(
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.followersService.getFollowersCount(userId);
  }

  @Get(':userId/following/count')
  @ApiOperation({ summary: 'Obtenir le nombre d\'utilisateurs suivis par un utilisateur' })
  @ApiParam({
    name: 'userId',
    description: 'ID de l\'utilisateur',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Nombre d\'utilisateurs suivis récupéré avec succès'
  })
  async getFollowingCount(
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.followersService.getFollowingCount(userId);
  }

  @Get('is-following/:targetUserId')
  @ApiOperation({ summary: 'Vérifier si l\'utilisateur suit un autre utilisateur' })
  @ApiParam({
    name: 'targetUserId',
    description: 'ID de l\'utilisateur cible',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Statut de suivi vérifié avec succès'
  })
  async isFollowing(
    @CurrentUser('sub') userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.isFollowing(userId, targetUserId);
  }
}
