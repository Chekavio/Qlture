import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateHistoryItemDto {
  @ApiProperty({ example: '65f1e19e1c92be6ad77f52f1', description: 'ID du contenu (Mongo)' })
  @IsString()
  contentId: string;

  @ApiProperty({ example: 'movie', enum: ['movie', 'book', 'game', 'album'] })
  @IsEnum(['movie', 'book', 'game', 'album'])
  type: string;

  @ApiProperty({ example: '2022-01-01T00:00:00.000Z', description: 'Date de consommation', required: false })
  @IsOptional()
  @IsDateString()
  consumedAt?: string;
}
