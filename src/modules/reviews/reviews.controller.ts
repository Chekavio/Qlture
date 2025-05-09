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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
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
import { NotFoundException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
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

  // --- ROUTE PUBLIQUE : doit être placée AVANT les routes dynamiques ---
  @Get('by-id/:reviewId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Obtenir une review par son ID (toutes les infos, public, enrichi user + like)' })
  @ApiParam({ name: 'reviewId', type: 'string', description: 'ID de la review' })
  @ApiResponse({ status: 200, description: 'Détails complets de la review', schema: { example: {
    _id: 'abc123',
    userId: 'user456',
    contentId: 'content789',
    reviewText: 'Super film !',
    rating: 4.5,
    likesCount: 2,
    commentsCount: 3,
    createdAt: '2025-01-01T12:00:00Z',
    updatedAt: '2025-01-01T12:00:00Z',
    type: 'movie',
    user: { id: 'user456', username: 'john', avatar: 'https://...' },
    isLiked: false
  } } })
  @Public()
  async getReviewById(
    @Param('reviewId') reviewId: string,
    @CurrentUser('sub') userId?: string
  ) {
    // Récupérer la review
    const review = await this.reviewsService['reviewModel'].findById(reviewId).lean();
    if (!review) throw new NotFoundException('Review introuvable');
    // Récupérer l'utilisateur auteur
    const user = await this.reviewsService['prisma'].user.findUnique({
      where: { id: review.userId },
      select: { id: true, username: true, avatar: true },
    });
    // Vérifier si l'utilisateur connecté a liké la review
    let isLiked = false;
    if (userId) {
      isLiked = !!(await this.reviewsService['reviewLikeModel'].findOne({ reviewId: review._id, userId }));
    }
    return {
      ...review,
      user: user || { id: review.userId, username: 'Utilisateur inconnu', avatar: null },
      isLiked,
    };
  }

  // --- NOUVEL ENDPOINT ---
  @Get('feed/following')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Afficher les reviews des personnes suivies par un user, triées par plus récentes' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page de pagination', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Taille de page', example: 10 })
  @ApiResponse({ status: 200, description: 'Liste paginée des reviews des personnes suivies', schema: { example: { data: [ { id: 'reviewId', contentId: '...', reviewText: '...', rating: 4.5, createdAt: '2025-01-01T12:00:00Z', updatedAt: '2025-01-01T12:00:00Z', type: 'movie', user: { id: '...', username: '...', avatar: null }, likesCount: 2, commentsCount: 1, isLiked: false } ], total: 42, page: 1, totalPages: 5 } } })
  async getReviewsFromFollowed(
    @CurrentUser('sub') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    if (!userId) throw new NotFoundException('Utilisateur non authentifié');
    return this.reviewsService.getReviewsFromFollowed(userId, page, limit);
  }

  // --- ROUTES DYNAMIQUES (doivent venir APRÈS la route publique) ---
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