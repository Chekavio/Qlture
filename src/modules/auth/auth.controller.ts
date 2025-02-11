import { Controller, Get, Post, Body, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Auth') // 🔹 Catégorie "Auth" dans Swagger
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth() // 🔹 Indique que cette route nécessite un token JWT
  @ApiOperation({ summary: 'Récupérer le profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur récupéré avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé (Token JWT invalide).' })
  async getProfile(@Req() req) {
    const user = await this.authService.getUserProfile(req.user.auth0_id);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  @Post('register')
  @ApiOperation({ summary: 'Enregistrer un utilisateur après connexion via Auth0' })
  @ApiBody({ schema: { example: { accessToken: 'JWT_TOKEN' } } })
  @ApiResponse({ status: 201, description: 'Utilisateur enregistré avec succès.' })
  @ApiResponse({ status: 401, description: 'Token Auth0 invalide.' })
  async register(@Body() body: { accessToken: string }) {
    return this.authService.registerUser(body.accessToken);
  }
}
