// ✅ FILE: reviews.controller.ts (avec @ApiBody)
import {
    Controller,
    Post,
    Delete,
    Patch,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Get,
    Query,
  } from '@nestjs/common';
  import { ReviewsService } from './reviews.service';
  import { CreateReviewDto } from './dto/create-review.dto';
  import { UpdateReviewDto } from './dto/update-review.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../common/decorators/user.decorator';
  import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiBody,
    ApiQuery,
  } from '@nestjs/swagger';
  
  @ApiTags('reviews')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Controller('reviews')
  export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}
  
    @Post()
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Créer une review (note + commentaire OU juste commentaire)' })
    @ApiResponse({ status: 201, description: 'Review créée avec succès' })
    @ApiResponse({ status: 409, description: 'Une review existe déjà pour ce contenu' })
    @ApiBody({ type: CreateReviewDto })
    async createReview(
      @CurrentUser('sub') userId: string,
      @Body() dto: CreateReviewDto,
    ) {
      return this.reviewsService.createReview(userId, dto);
    }
  
    @Post('rating')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Ajouter uniquement une note à un contenu' })
    @ApiBody({ schema: { properties: { contentId: { type: 'string' }, rating: { type: 'number', minimum: 0.5, maximum: 5 } }, required: ['contentId', 'rating'] } })
    @ApiResponse({ status: 201, description: 'Note ajoutée avec succès' })
    async addRating(
      @CurrentUser('sub') userId: string,
      @Body('contentId') contentId: string,
      @Body('rating') rating: number,
    ) {
      return this.reviewsService.createRating(userId, contentId, rating);
    }
  
    @Patch(':contentId')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Modifier une review existante' })
    @ApiParam({ name: 'contentId', type: 'string' })
    @ApiResponse({ status: 200, description: 'Review mise à jour' })
    @ApiResponse({ status: 404, description: 'Review non trouvée' })
    @ApiBody({ type: UpdateReviewDto })
    async updateReview(
      @CurrentUser('sub') userId: string,
      @Param('contentId') contentId: string,
      @Body() dto: UpdateReviewDto,
    ) {
      return this.reviewsService.updateReview(userId, contentId, dto);
    }
  
    @Delete(':contentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Supprimer la review de l’utilisateur pour un contenu' })
    @ApiParam({ name: 'contentId', type: 'string' })
    @ApiResponse({ status: 204, description: 'Review supprimée' })
    @ApiResponse({ status: 404, description: 'Review non trouvée' })
    async deleteReview(
      @CurrentUser('sub') userId: string,
      @Param('contentId') contentId: string,
    ) {
      return this.reviewsService.deleteReview(userId, contentId);
    }

    @Get('user/:contentId')
    @ApiOperation({ summary: 'Récupérer la note et le commentaire du user connecté pour un contenu (UX pré-remplissage)' })
    @ApiParam({ name: 'contentId', type: 'string', description: 'ID du contenu' })
    @ApiResponse({ status: 200, description: 'Note et commentaire du user', schema: { example: { rating: 4.5, reviewText: 'Super film !' } } })
    async getUserReviewData(
      @CurrentUser('sub') userId: string,
      @Param('contentId') contentId: string,
    ) {
      const review = await this.reviewsService.getUserReviewForContent(contentId, userId);
      if (!review) return { rating: undefined, reviewText: undefined };
      return { rating: review.rating, reviewText: review.reviewText };
    }

    @Get(':userId/:contentId')
    @ApiOperation({ summary: 'Récupérer la note et le commentaire d’un user précis pour un contenu (usage admin, modération, etc.)' })
    @ApiParam({ name: 'userId', type: 'string', description: 'ID du user' })
    @ApiParam({ name: 'contentId', type: 'string', description: 'ID du contenu' })
    @ApiResponse({ status: 200, description: 'Note et commentaire du user', schema: { example: { rating: 4.5, reviewText: 'Super film !' } } })
    async getAnyUserReviewData(
      @Param('userId') userId: string,
      @Param('contentId') contentId: string,
    ) {
      const review = await this.reviewsService.getUserReviewForContent(contentId, userId);
      if (!review) return { rating: undefined, reviewText: undefined };
      return { rating: review.rating, reviewText: review.reviewText };
    }

    @Get('user/:userId/all')
    @ApiOperation({ summary: 'Récupérer toutes les reviews pour un utilisateur donné, avec tri et filtres' })
    @ApiParam({ name: 'userId', type: 'string', description: 'ID du user' })
    @ApiQuery({
      name: 'sort',
      required: false,
      enum: ['updatedAt', 'createdAt', 'likes', 'comments', 'rating'],
      description: 'Champ de tri : updatedAt (date de mise à jour), createdAt (date de création), likes (nombre de likes), comments (nombre de commentaires), rating (note)',
      example: 'updatedAt',
      schema: { default: 'updatedAt' }
    })
    @ApiQuery({
      name: 'order',
      required: false,
      enum: ['asc', 'desc'],
      description: 'Ordre de tri : asc (croissant) ou desc (décroissant)',
      example: 'desc',
      schema: { default: 'desc' }
    })
    @ApiResponse({ status: 200, description: 'Liste des reviews de l’utilisateur', schema: { example: [ { contentId: 'abc123', rating: 4.5, reviewText: 'Super film !', updatedAt: '2025-01-01T12:00:00Z', likesCount: 2, commentsCount: 1 } ] } })
    async getAllReviewsForUser(
      @Param('userId') userId: string,
      @Query('sort') sort?: string,
      @Query('order') order?: 'asc' | 'desc',
    ) {
      return this.reviewsService.getAllReviewsForUser(userId, sort, order);
    }
  }