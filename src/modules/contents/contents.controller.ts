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
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un contenu par son ID' })
  @ApiResponse({ status: 200, description: 'Contenu trouvé.' })
  @ApiResponse({ status: 404, description: 'Contenu non trouvé.' })
  async getContentById(@Param('id') id: string) {
    return this.contentsService.getContentById(id);
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
