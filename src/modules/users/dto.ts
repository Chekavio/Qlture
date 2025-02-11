import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
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
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'URL de l\'avatar de l\'utilisateur',
    example: 'https://example.com/avatar.jpg',
    required: false
  })
  @IsString()
  @IsOptional()
  avatar_url?: string;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nom d\'utilisateur',
    example: 'johndoe',
    required: false
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'Adresse email de l\'utilisateur',
    example: 'john.doe@example.com',
    required: false
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'URL de l\'avatar de l\'utilisateur',
    example: 'https://example.com/avatar.jpg',
    required: false
  })
  @IsString()
  @IsOptional()
  avatar_url?: string;
}
