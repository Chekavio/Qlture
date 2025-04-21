import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateHistoryItemDto } from './dto/create-history-item.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('history')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('history-items')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter un contenu à la liste historique (vu/lu/...)' })
  @ApiBody({ type: CreateHistoryItemDto })
  @ApiResponse({ status: 201 })
  async addItem(
    @Body() dto: CreateHistoryItemDto,
    @CurrentUser('sub') userId: string,
  ) {
    // Passe consumedAt tel quel (string ISO), le service ou le schema se charge de la conversion
    return this.historyService.addItem({ ...dto, userId });
  }

  @Delete(':type/:contentId')
  @ApiOperation({ summary: 'Supprimer un contenu de la liste historique' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  @ApiParam({ name: 'contentId', type: 'string' })
  async removeItem(
    @Param('type') type: string,
    @Param('contentId') contentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.historyService.removeItem(userId, contentId, type);
  }

  @Get(':userId/:type')
  @ApiOperation({ summary: 'Récupérer la liste historique d’un user/type' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  async getUserHistory(
    @Param('userId') userId: string,
    @Param('type') type: string,
  ) {
    return this.historyService.getUserHistory(userId, type);
  }

  @Get('content/:contentId/:type')
  @ApiOperation({ summary: 'Récupérer tous les users ayant un contenu/type dans leur historique' })
  @ApiParam({ name: 'contentId', type: 'string' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  async getUsersForContent(
    @Param('contentId') contentId: string,
    @Param('type') type: string,
  ) {
    return this.historyService.getUsersForContent(contentId, type);
  }

  @Get('content/:contentId/:type/count')
  @ApiOperation({ summary: 'Compter combien d’utilisateurs ont ce contenu/type dans leur historique' })
  @ApiParam({ name: 'contentId', type: 'string' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  async countUsersForContent(
    @Param('contentId') contentId: string,
    @Param('type') type: string,
  ) {
    return this.historyService.countUsersForContent(contentId, type);
  }
}
