import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentsService } from './contents.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateContentDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Contents')
@Controller('contents')
export class ContentsController {
  constructor(
    private readonly contentsService: ContentsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau contenu' })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({ status: 201, description: 'Contenu créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createContent(@Body() dto: CreateContentDto) {
    return this.contentsService.createContent(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les contenus avec pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des contenus paginés.' })
  async getAllContents(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.contentsService.getAllContents(Number(page), Number(limit));
  }

  @Public()
  @Get('monthly-releases')
  @ApiOperation({ summary: 'Get current month releases ranked by rating' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: ['movie', 'book', 'game', 'album'],
    description: 'Filter by content type'
  })
  @ApiResponse({ status: 200, description: 'List of current month releases.' })
  async getCurrentMonthReleases(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: 'movie' | 'book' | 'game' | 'album',
  ) {
    return this.contentsService.getCurrentMonthReleases(
      Number(page),
      Number(limit),
      type,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un contenu par son ID' })
  @ApiResponse({ status: 200, description: 'Contenu trouvé.' })
  @ApiResponse({ status: 404, description: 'Contenu non trouvé.' })
  async getContentById(@Param('id') id: string) {
    return this.contentsService.getContentById(id);
  }

  @Public()
  @Get('decade/:decade')
  @ApiOperation({ summary: 'Get content from a specific decade' })
  @ApiParam({ 
    name: 'decade', 
    description: 'Decade number: Use 2 digits for 1900s/2000s (e.g., 20 for 1920s if < 40, 2020s if >= 40), or full year for other centuries (e.g., 1820 for 1820s)',
    type: Number
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: ['movie', 'book', 'game', 'album'],
    description: 'Filter by content type'
  })
  @ApiResponse({ status: 200, description: 'List of content from the specified decade.' })
  @ApiResponse({ status: 400, description: 'Invalid decade parameter.' })
  async getDecadeContent(
    @Param('decade') decade: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: 'movie' | 'book' | 'game' | 'album',
  ) {
    // Validate decade parameter
    decade = Number(decade);
    if (isNaN(decade) || decade < 0) {
      throw new BadRequestException('Decade must be a positive number');
    }
    return this.contentsService.getDecadeContent(
      decade,
      Number(page),
      Number(limit),
      type,
    );
  }

  @UseGuards(OptionalJwtAuthGuard) // Déplacé avant @Public pour s'assurer qu'il est appliqué en premier
  @Public() 
  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Obtenir review utilisateur et reviews avec commentaires pour un contenu',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['date_desc', 'date_asc', 'rating_desc', 'rating_asc'],
    example: 'date_desc',
  })
  @ApiBearerAuth('JWT-auth')
  async getContentReviewData(
    @Param('id') contentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sort') sort: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc' = 'date_desc',
    @CurrentUser('sub') userId?: string,
  ) {
    return this.reviewsService.getPaginatedCommentReviewsWithUser(
      contentId,
      page,
      limit,
      sort,
      userId,
    );
  }

  @Public()
  @Get('stats/:id')
  @ApiOperation({ summary: 'Obtenir les statistiques d’un contenu' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Statistiques du contenu.' })
  @ApiResponse({ status: 404, description: 'Contenu non trouvé.' })
  async getContentStats(@Param('id') id: string) {
    return this.contentsService.getContentStats(id);
  }
}
