import {
    Controller,
    Post,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    Get,
  } from '@nestjs/common';
  import { ReviewLikesService } from './review_likes.service';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../../common/decorators/user.decorator';
  import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
  } from '@nestjs/swagger';
  
  @ApiTags('Review Likes')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Controller('reviews')
  export class ReviewLikesController {
    constructor(private readonly reviewLikesService: ReviewLikesService) {}
  
    @Post(':id/like')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Liker ou unliker une review (toggle)' })
    @ApiParam({ name: 'id', description: 'ID de la review (Mongo ObjectId)' })
    @ApiResponse({ status: 200, description: 'Like ajouté ou retiré.' })
    async toggleLike(
      @Param('id') reviewId: string,
      @CurrentUser('sub') userId: string
    ) {
      return this.reviewLikesService.toggleLike(reviewId, userId);
    }
  
    @Get(':id/likes/count')
    @ApiOperation({ summary: 'Nombre total de likes pour une review' })
    @ApiResponse({ status: 200, description: 'Nombre de likes renvoyé.' })
    async getLikeCount(@Param('id') reviewId: string) {
      const count = await this.reviewLikesService.getLikeCount(reviewId);
      return { reviewId, count };
    }
  
    @Get(':id/likes/me')
    @ApiOperation({ summary: 'Vérifie si l’utilisateur connecté a liké la review' })
    async hasUserLiked(
      @Param('id') reviewId: string,
      @CurrentUser('sub') userId: string
    ) {
      const liked = await this.reviewLikesService.hasUserLiked(reviewId, userId);
      return { liked };
    }
  }
  