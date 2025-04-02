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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CommentDto } from './dto/comment.dto';

@ApiTags('Review Comments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewCommentsController {
  constructor(private readonly reviewCommentsService: ReviewCommentsService) {}

  @Post(':id/comments')
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
      dto.parentCommentId,
    );
  }

  @Get(':id/comments')
@ApiOperation({ summary: 'Lister les commentaires d’une review (paginé, trié)' })
@ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
@ApiQuery({
  name: 'sort',
  required: false,
  enum: ['date_desc', 'date_asc', 'likes_desc'],
  example: 'date_desc',
})
@ApiResponse({ status: 200, description: 'Liste paginée des commentaires' })
async getComments(
  @Param('id') reviewId: string,
  @Query('page') page = 1,
  @Query('limit') limit = 10,
  @Query('sort') sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
  @CurrentUser('sub') userId?: string,
) {
  const pageNum = Number(page);
  const limitNum = Number(limit);

  return this.reviewCommentsService.getCommentsForReview(
    reviewId,
    userId,
    isNaN(pageNum) ? 1 : pageNum,
    isNaN(limitNum) ? 10 : limitNum,
    sort,
  );
}


  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un commentaire (seulement si auteur)' })
  @ApiParam({ name: 'commentId', type: 'string' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.reviewCommentsService.delete(commentId, userId);
  }
}
