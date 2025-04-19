import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Patch,
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
import { AuthGuard } from '@nestjs/passport';
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

  @Post('manual')
  @ApiOperation({ summary: 'Insérer un contenu manuellement', description: 'Ajoute un contenu (book, movie, game, album) avec toutes les métadonnées possibles. Voir les exemples pour chaque type.' })
  @ApiBody({
    type: CreateContentDto,
    examples: {
      book: {
        summary: 'Livre',
        value: {
          title: 'War of the Worlds',
          type: 'book',
          description: 'A classic science fiction novel.',
          release_date: '2017-01-01',
          genres: ['Science Fiction', 'Adventure'],
          metadata: {
            subtitle: 'A Space Odyssey',
            authors: ['H.G. Wells'],
            page_count: 320,
            publisher: ['Penguin'],
            isbn: '978-0451524935',
            openlibrary_edition_id: 'OL1234567M',
            series: ['Classics'],
            translated_from: ['fr']
          },
          likes_count: 0,
          image_url: 'https://example.com/image.jpg'
        }
      },
      movie: {
        summary: 'Film',
        value: {
          title: 'Inception',
          type: 'movie',
          description: 'A mind-bending thriller.',
          release_date: '2010-07-16',
          genres: ['Science Fiction', 'Thriller'],
          metadata: {
            director: 'Christopher Nolan',
            actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
            duration: 148
          },
          likes_count: 0,
          image_url: 'https://example.com/inception.jpg'
        }
      },
      album: {
        summary: 'Album',
        value: {
          title: 'Discovery',
          type: 'album',
          description: 'A classic electronic album.',
          release_date: '2001-03-12',
          genres: ['Electronic', 'House'],
          metadata: {
            artist: 'Daft Punk',
            tracks: ['One More Time', 'Aerodynamic'],
            total_duration: 3600
          },
          likes_count: 0,
          image_url: 'https://example.com/discovery.jpg'
        }
      },
      game: {
        summary: 'Jeu vidéo',
        value: {
          title: 'The Witcher 3',
          type: 'game',
          description: 'An open-world RPG.',
          release_date: '2015-05-19',
          genres: ['RPG', 'Adventure'],
          metadata: {
            developers: ['CD Projekt'],
            platforms: ['PC', 'PlayStation 4'],
            duration: 120
          },
          likes_count: 0,
          image_url: 'https://example.com/witcher3.jpg'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Contenu inséré avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async insertContentManual(@Body() dto: CreateContentDto) {
    return this.contentsService.createContent(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard('jwt'))
  @Post('manual_book')
  @ApiOperation({ summary: 'Insérer un livre manuellement (avec dédoublonnage et enrichissement OpenLibrary)', description: 'Ajoute un livre avec la même logique que le script d’import (dédoublonnage, mapping, enrichissement OpenLibrary si besoin). Retourne le contenu inséré ou le doublon.' })
  @ApiBody({
    type: CreateContentDto,
    examples: {
      livre_complet: {
        summary: 'Livre (tous champs)',
        value: {
          title: 'War of the Worlds',
          title_vo: 'The War of the Worlds',
          type: 'book',
          description: 'A classic science fiction novel.',
          description_vo: 'Roman de science-fiction classique.',
          release_date: '2017-01-01',
          genres: ['Science Fiction', 'Adventure'],
          languages: ['en'],
          metadata: {
            subtitle: 'A Space Odyssey',
            authors: ['H.G. Wells'],
            publisher: ['Penguin'],
            page_count: 320,
            pagination: '320 pages',
            isbn: '978-0451524935',
            isbn_10: ['0451524934'],
            isbn_13: ['9780451524935'],
            openlibrary_edition_id: 'OL1234567M',
            work_id: 'OL9876543W',
            publish_country: 'UK',
            publish_places: ['London'],
            identifiers: { goodreads: ['12345'], librarything: ['67890'] },
            series: ['Classics'],
            contributors: [{ role: 'Editor', name: 'John Doe' }],
            translated_from: ['fr'],
            weight: '350g',
            physical_format: 'Paperback',
            dimensions: '20x13x2cm'
          },
          likes_count: 0,
          average_rating: 4.5,
          reviews_count: 42,
          comments_count: 13,
          image_url: 'https://example.com/image.jpg'
        }
      },
      chambre12: {
        summary: 'Chambre 12',
        value: {
          title: 'Chambre 12',
          title_vo: 'Chambre 12',
          type: 'book',
          description: "Dans une chambre blanche, elle parle. Esprit fragmentaire et fragmenté, elle dénombre le quotidien, observe et nous révèle à son monde, ses petites excursions hors de la chambre 12, et ce qu'elle rêve et imagine de l'autre coté de la fenêtre.",
          description_vo: "Dans une chambre blanche, elle parle. Esprit fragmentaire et fragmenté, elle dénombre le quotidien, observe et nous révèle à son monde, ses petites excursions hors de la chambre 12, et ce qu'elle rêve et imagine de l'autre coté de la fenêtre.",
          release_date: '2025-01-16',
          genres: ['Poésie'],
          languages: ['fr'],
          metadata: {
            subtitle: '',
            authors: ['Sara Balbi di Bernardo'],
            publisher: ['Editions de La Crypte'],
            page_count: null,
            pagination: null,
            isbn: '978-2367391908',
            isbn_10: ['2367391904'],
            isbn_13: ['9782367391908'],
            openlibrary_edition_id: null,
            work_id: null,
            publish_country: 'FR',
            publish_places: ['France'],
            identifiers: {},
            series: [],
            contributors: [],
            translated_from: [],
            weight: '99,8g',
            physical_format: 'Broché',
            dimensions: null
          },
          likes_count: 0,
          average_rating: 0,
          reviews_count: 0,
          comments_count: 0,
          image_url: 'https://www.editionsdelacrypte.fr/wp-content/uploads/2025/01/Couv_chambre12_JPEG-1.jpg'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Livre inséré ou mis à jour.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async manualBook(@Body() dto: CreateContentDto) {
    return this.contentsService.manualUpsertBook(dto);
  }

  @Post('manual_movie')
  @ApiOperation({ summary: 'Insérer un film manuellement (avec dédoublonnage)', description: 'Ajoute un film avec la même logique que le script d’import (dédoublonnage, mapping). Retourne le contenu inséré ou le doublon.' })
  @ApiBody({
    type: CreateContentDto,
    examples: {
      film: {
        summary: 'Film',
        value: {
          title: 'Inception',
          type: 'movie',
          description: 'A mind-bending thriller.',
          release_date: '2010-07-16',
          genres: ['Science Fiction', 'Thriller'],
          metadata: {
            director: 'Christopher Nolan',
            actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
            duration: 148
          },
          likes_count: 0,
          image_url: 'https://example.com/inception.jpg'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Film inséré ou mis à jour.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async manualMovie(@Body() dto: CreateContentDto) {
    // Pour l’instant, même logique que manualUpsertBook mais sur type movie
    // À adapter si besoin pour enrichissement TMDB
    return this.contentsService.manualUpsertMovie(dto);
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

  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @ApiOperation({ summary: 'Met à jour un ou plusieurs champs d’un content par son id (JWT obligatoire)' })
  @ApiParam({ name: 'id', description: 'ID du content', type: String })
  @ApiBody({ schema: { type: 'object', additionalProperties: true, example: { image_url: 'https://url.de.ton/image.jpg' } } })
  async patchContent(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.contentsService.patchContent(id, body);
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
