import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDescriptionDto {
  @ApiProperty({
    description: 'User bio or description',
    maxLength: 500,
    required: true,
    example: 'Hi! I\'m a book enthusiast who loves discovering new stories. I particularly enjoy science fiction and fantasy genres.'
  })
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description: string;
}
