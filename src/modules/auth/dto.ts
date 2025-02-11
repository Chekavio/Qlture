import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTO pour l'inscription avec un token Auth0
export class LoginDto {
  @ApiProperty({
    description: 'Token JWT renvoyé par Auth0',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string; // Token JWT renvoyé par Auth0
}

// DTO pour formater les données de l'utilisateur renvoyé après inscription
export class AuthUserDto {
  @ApiProperty({
    description: 'ID unique de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'ID Auth0 de l\'utilisateur',
    example: 'auth0|123456789'
  })
  @IsString()
  auth0_id: string;

  @ApiProperty({
    description: 'Nom d\'utilisateur',
    example: 'johndoe'
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Adresse email de l\'utilisateur',
    example: 'john.doe@example.com'
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'URL de l\'avatar de l\'utilisateur',
    example: 'https://example.com/avatar.jpg'
  })
  @IsString()
  avatar_url: string;
}
