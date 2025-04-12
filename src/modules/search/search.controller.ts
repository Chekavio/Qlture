import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';

@ApiTags('search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiQuery({
    name: 'genres',
    required: false,
    type: String,
    isArray: true,
    description: 'Liste de genres (ex: genres=Sci-fi&genres=Action)',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche paginés',
    type: SearchResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Aucun critère de recherche fourni (q, type ou genres)',
  })
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    const { q, type, genres } = query;

    if (!q && !type && (!genres || !genres.length)) {
      throw new BadRequestException(
        'Au moins un des paramètres (q, type, genres) est requis.',
      );
    }

    return this.searchService.searchContent(query);
  }
}
