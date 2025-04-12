import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Texte de recherche',
    example: 'Star Wars',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Type de contenu',
    enum: ['movie', 'book', 'game', 'album'],
  })
  @IsOptional()
  @IsIn(['movie', 'book', 'game', 'album'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Genres du contenu',
    type: [String],
    example: ['Sci-fi', 'Adventure'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  }, { toClassOnly: true })
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @ApiPropertyOptional({
    description: 'Page de pagination (1 par défaut)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Nombre de résultats par page (20 par défaut)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Critère de tri',
    enum: ['date_desc', 'date_asc', 'rating_desc', 'rating_asc'],
    example: 'date_desc',
  })
  @IsOptional()
  @IsIn(['date_desc', 'date_asc', 'rating_desc', 'rating_asc'])
  sort?: string;
}
