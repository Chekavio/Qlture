import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from './users.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur mis à jour avec succès',
    type: User
  })
  @ApiResponse({ status: 401, description: 'Non autorisé - Token invalide ou expiré' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }
}
