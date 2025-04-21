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

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
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
  @ApiBearerAuth('JWT-auth')
  @Get(':id/comments')
  @ApiOperation({ summary: 'Obtenir tous les commentaires d\'une review (flat, paginé)' })
  @ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['date_desc', 'date_asc', 'likes_desc'] })
  @ApiResponse({ status: 200, description: 'Commentaires récupérés' })
  async getAllCommentsForReview(
    @Param('id') reviewId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sort') sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
    @CurrentUser('sub') userId?: string,
  ) {
    return this.reviewCommentsService.getAllCommentsForReview(
      reviewId,
      userId,
      Number(page),
      Number(limit),
      sort,
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('comments/:id/replies')
  @ApiOperation({ summary: 'Lister les replies d’un commentaire (paginé, trié)' })
  @ApiParam({ name: 'id', description: 'ID du commentaire parent', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['date_desc', 'date_asc', 'likes_desc'],
    example: 'date_desc',
  })
  @ApiResponse({ status: 200, description: 'Liste paginée des replies' })
  async getReplies(
    @Param('id') commentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 5,
    @Query('sort') sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
    @CurrentUser('sub') userId?: string,
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    return this.reviewCommentsService.getRepliesForComment(
      commentId,
      userId,
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 5 : limitNum,
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
