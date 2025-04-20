import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { CreateWishlistItemInputDto } from './dto/create-wishlist-item.input.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('wishlist')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wishlist-items')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter un contenu à la wishlist' })
  @ApiBody({ type: CreateWishlistItemInputDto })
  @ApiResponse({ status: 201 })
  async addItem(
    @Body() dto: CreateWishlistItemInputDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.wishlistService.addItem({ ...dto, userId });
  }

  @Delete(':type/:contentId')
  @ApiOperation({ summary: 'Supprimer un contenu de la wishlist' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  @ApiParam({ name: 'contentId', type: 'string' })
  async removeItem(
    @Param('type') type: string,
    @Param('contentId') contentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.wishlistService.removeItem(userId, contentId, type);
  }

  @Get(':userId/:type')
  @ApiOperation({ summary: 'Récupérer la wishlist d’un user/type' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  async getUserWishlist(
    @Param('userId') userId: string,
    @Param('type') type: string,
  ) {
    return this.wishlistService.getUserWishlist(userId, type);
  }

  @Get('content/:contentId/:type')
  @ApiOperation({ summary: 'Récupérer tous les users ayant un contenu/type en wishlist' })
  @ApiParam({ name: 'contentId', type: 'string' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  async getUsersForContent(
    @Param('contentId') contentId: string,
    @Param('type') type: string,
  ) {
    return this.wishlistService.getUsersForContent(contentId, type);
  }

  @Get('content/:contentId/:type/count')
  @ApiOperation({ summary: 'Compter combien d’utilisateurs ont ce contenu/type en wishlist' })
  @ApiParam({ name: 'contentId', type: 'string' })
  @ApiParam({ name: 'type', enum: ['movie', 'book', 'game', 'album'] })
  async countUsersForContent(
    @Param('contentId') contentId: string,
    @Param('type') type: string,
  ) {
    return this.wishlistService.countUsersForContent(contentId, type);
  }
}
