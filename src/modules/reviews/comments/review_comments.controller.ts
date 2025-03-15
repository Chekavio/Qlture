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
    @ApiOperation({ summary: 'Poster un commentaire sous une review' })
    @ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
    @ApiResponse({ status: 201, description: 'Commentaire créé' })
    @ApiBody({ type: CommentDto })
    async createComment(
      @Param('id') reviewId: string,
      @CurrentUser('sub') userId: string,
      @Body() dto: CommentDto
    ) {
      if (typeof userId !== 'string') {
        throw new Error('userId must be a string');
      }
      return this.reviewCommentsService.create(reviewId, userId, dto.comment);
    }
  
    @Get(':id/comments')
    @ApiOperation({ summary: 'Lister les commentaires d’une review (paginé)' })
    @ApiParam({ name: 'id', description: 'ID de la review', type: 'string' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({
      name: 'sort',
      required: false,
      enum: ['date_desc', 'date_asc'],
      example: 'date_desc',
    })
    async getComments(
      @Param('id') reviewId: string,
      @Query('page') page = 1,
      @Query('limit') limit = 10,
      @Query('sort') sort: 'date_desc' | 'date_asc' = 'date_desc'
    ) {
      return this.reviewCommentsService.findByReview(reviewId, page, limit, sort);
    }
  
    @Delete('comments/:commentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Supprimer un commentaire (seulement si auteur)' })
    async deleteComment(
      @Param('commentId') commentId: string,
      @CurrentUser('sub') userId: string
    ) {
      if (typeof userId !== 'string') {
        throw new Error('userId must be a string');
      }
      await this.reviewCommentsService.delete(commentId, userId);
    }
  }
  