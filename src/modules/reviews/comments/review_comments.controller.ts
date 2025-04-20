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
// @ApiBearerAuth('JWT-auth') // Retirer ce décorateur de classe, il force l'auth sur toutes les routes
@Controller('reviews')
export class ReviewCommentsController {
  constructor(private readonly reviewCommentsService: ReviewCommentsService) {}

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
      dto.parentCommentId,
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':id/comments/racines')
  @ApiOperation({ summary: 'Commentaires racines d\'une review (threaded, paginé, public ou connecté)' })
  @ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'repliesLimit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['date_desc', 'date_asc', 'likes_desc'] })
  @ApiResponse({ status: 200, description: 'Commentaires racines récupérés' })
  async getRootComments(
    @Param('id') reviewId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('repliesLimit') repliesLimit = 2,
    @Query('sort') sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
    @CurrentUser('sub') userId?: string,
  ) {
    console.log('Entrée dans le contrôleur getRootComments', reviewId, typeof reviewId);
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const repliesLimitNum = Number(repliesLimit);
    return this.reviewCommentsService.getRootCommentsForReview(
      reviewId,
      userId,
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 10 : limitNum,
      isNaN(repliesLimitNum) ? 2 : repliesLimitNum,
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
