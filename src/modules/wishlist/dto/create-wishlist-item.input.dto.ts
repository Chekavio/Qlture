import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export class CreateWishlistItemInputDto {
  @ApiProperty({ example: '65f1e19e1c92be6ad77f52f1', description: 'ID du contenu (Mongo)' })
  @IsString()
  contentId: string;

  @ApiProperty({ example: 'movie', enum: ['movie', 'book', 'game', 'album'] })
  @IsEnum(['movie', 'book', 'game', 'album'])
  type: string;
}
