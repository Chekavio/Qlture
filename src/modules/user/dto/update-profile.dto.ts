import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'New username (3-20 characters, letters, numbers, underscore, hyphen)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
    required: false
  })
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'Username must start with a letter and can only contain letters, numbers, underscores, and hyphens'
  })
  username?: string;

  @ApiProperty({
    description: 'User bio or description',
    maxLength: 500,
    required: false,
    example: 'Hi! I love reading science fiction and fantasy books.'
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
