import {
    Controller,
    Post,
    Param,
    UseGuards,
    Get,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../../../common/decorators/user.decorator';  
  import { ReviewCommentLikesService } from './review_comment_likes.service';
  import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiParam,
  } from '@nestjs/swagger';
  
  @ApiTags('Review Comment Likes')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Controller('review-comments')
  export class ReviewCommentLikesController {
    constructor(private readonly service: ReviewCommentLikesService) {}
  
    @Post(':id/like')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Like ou unlike un commentaire (toggle)' })
    @ApiParam({ name: 'id', description: 'ID du commentaire' })
    async toggleLike(
      @Param('id') commentId: string,
      @CurrentUser('sub') userId: string,
    ) {
      return this.service.toggleLike(commentId, userId);
    }
  
    @Get(':id/likes/count')
    @ApiOperation({ summary: 'Nombre de likes pour un commentaire' })
    async count(@Param('id') commentId: string) {
      const count = await this.service.getLikeCount(commentId);
      return { commentId, count };
    }
  
    @Get(':id/likes/me')
    @ApiOperation({ summary: 'Vérifie si le user connecté a liké le commentaire' })
    async hasLiked(
      @Param('id') commentId: string,
      @CurrentUser('sub') userId: string,
    ) {
      const liked = await this.service.hasUserLiked(commentId, userId);
      return { liked };
    }
  }
  