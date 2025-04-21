import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ReviewCommentsService } from './review_comments.service';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../common/decorators/user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentDto } from './dto/comment.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Review Comments')
@Controller('reviews')
export class ReviewCommentsController {
  constructor(private readonly reviewCommentsService: ReviewCommentsService) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comments/add')
  @ApiOperation({ summary: 'Poster un commentaire ou une réponse sous une review' })
  @ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
  @ApiBody({ type: CommentDto })
  @ApiResponse({ status: 201, description: 'Commentaire créé' })
  async createComment(
    @Param('id') reviewId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CommentDto,
  ) {
    return this.reviewCommentsService.create(
      reviewId,
      userId,
      dto.comment,
      dto.replyToCommentId,
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/comments-list/all')
  @ApiOperation({ summary: 'Obtenir tous les commentaires d\'une review (flat, paginé)' })
  @ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['date_desc', 'date_asc', 'likes_desc'] })
  @ApiResponse({ status: 200, description: 'Commentaires récupérés' })
  @ApiBearerAuth('JWT-auth')
  async getAllCommentsForReview(
    @Param('id') reviewId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sort') sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
    @CurrentUser('sub') userId?: string,
  ) {
    return this.reviewCommentsService.getCommentsForReview(
      reviewId,
      userId,
      Number(page),
      Number(limit),
      sort,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un commentaire (seulement si auteur)' })
  @ApiParam({ name: 'commentId', description: 'ID du commentaire', type: 'string' })
  @ApiResponse({ status: 204, description: 'Commentaire supprimé' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.reviewCommentsService.delete(commentId, userId);
  }
}
