import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('Contents') // 🔹 Tag Swagger pour catégoriser les endpoints
@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau contenu' })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({ status: 201, description: 'Contenu créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createContent(@Body() dto: CreateContentDto) {
    return this.contentsService.createContent(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les contenus avec pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des contenus paginés.' })
  async getAllContents(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.contentsService.getAllContents(Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un contenu par son ID' })
  @ApiResponse({ status: 200, description: 'Contenu trouvé.' })
  @ApiResponse({ status: 404, description: 'Contenu non trouvé.' })
  async getContentById(@Param('id') id: string) {
    return this.contentsService.getContentById(id);
  }
}
