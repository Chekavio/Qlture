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
  } from '@nestjs/swagger';
  
  @ApiTags('reviews')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Controller('reviews')
  export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}
  
    @Post()
    @ApiOperation({ summary: 'Créer une review pour un contenu' })
    @ApiResponse({ status: 201, description: 'Review créée avec succès' })
    @ApiResponse({ status: 409, description: 'Une review existe déjà pour ce contenu' })
    @ApiBody({ type: CreateReviewDto })
    async createReview(
      @CurrentUser('sub') userId: string,
      @Body() dto: CreateReviewDto,
    ) {
      return this.reviewsService.createReview(userId, dto);
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
  }