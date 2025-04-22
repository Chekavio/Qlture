import {
  IsString,
  IsOptional,
  IsDate,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContributorDto {
  @ApiProperty({ description: 'Role of the contributor', example: 'Editor', nullable: true })
  @IsString()
  role: string | null;

  @ApiProperty({ description: 'Name of the contributor', example: 'John Doe', nullable: true })
  @IsString()
  name: string | null;
}

export class MetadataDto {
  @ApiPropertyOptional({ description: 'Subtitle for books', example: 'A Space Odyssey', nullable: true })
  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @ApiPropertyOptional({ description: 'Content language', example: 'en', nullable: true })
  @IsOptional()
  @IsString()
  language?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Publisher(s)', example: ['Penguin', 'Random House'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publisher?: string[] | null;

  @ApiPropertyOptional({ description: 'Director for movies', example: 'Christopher Nolan', nullable: true })
  @IsOptional()
  @Transform(({ value }) => value === null ? undefined : value)
  @IsString()
  director?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Actors for movies', example: ['Tom Hanks', 'Meg Ryan'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actors?: string[] | null;

  @ApiPropertyOptional({ type: [String], description: 'Platforms for games', example: ['PC', 'PlayStation'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[] | null;

  @ApiPropertyOptional({ type: [String], description: 'Developers for games', example: ['Valve', 'CD Projekt'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  developers?: string[] | null;

  @ApiPropertyOptional({ type: [String], description: 'Authors for books', example: ['H.G. Wells'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[] | null;

  @ApiPropertyOptional({ description: 'Page count for books', example: 320, nullable: true })
  @IsOptional()
  @IsNumber()
  page_count?: number | null;

  @ApiPropertyOptional({ description: 'Pagination info for books', example: 'xxiv+384', nullable: true })
  @IsOptional()
  @IsString()
  pagination?: string | null;

  @ApiPropertyOptional({ description: 'ISBN', example: '978-0451524935', nullable: true })
  @IsOptional()
  @IsString()
  isbn?: string | null;

  @ApiPropertyOptional({ description: 'ISBN-10', example: '2367391904', nullable: true, type: String })
  @IsOptional()
  @IsString()
  isbn_10?: string | null;

  @ApiPropertyOptional({ description: 'ISBN-13', example: '9782367391908', nullable: true, type: String })
  @IsOptional()
  @IsString()
  isbn_13?: string | null;

  @ApiPropertyOptional({ description: 'OpenLibrary Edition ID', example: 'OL1234567M', nullable: true })
  @IsOptional()
  @IsString()
  openlibrary_edition_id?: string | null;

  @ApiPropertyOptional({ description: 'Work ID', example: 'OL654321W', nullable: true })
  @IsOptional()
  @IsString()
  work_id?: string | null;

  @ApiPropertyOptional({ description: 'Publish country', example: 'US', nullable: true })
  @IsOptional()
  @IsString()
  publish_country?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Publish places', example: ['New York'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publish_places?: string[] | null;

  @ApiPropertyOptional({
    description: 'Identifiers',
    example: { goodreads: '123456', librarything: '654321' },
    type: 'object',
    additionalProperties: { type: 'string' },
    nullable: true
  })
  @IsOptional()
  identifiers?: Record<string, any> | null;

  @ApiPropertyOptional({ type: [String], description: 'Series', example: ['Dune Saga'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  series?: string[] | null;

  @ApiPropertyOptional({ type: [ContributorDto], description: 'Contributors', example: [{ role: 'Editor', name: 'John Doe' }], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContributorDto)
  contributors?: ContributorDto[] | null;

  @ApiPropertyOptional({ type: [String], description: 'Translated from languages', example: ['fr'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  translated_from?: string[] | null;

  @ApiPropertyOptional({ description: 'Weight', example: '300g', nullable: true })
  @IsOptional()
  @IsString()
  weight?: string | null;

  @ApiPropertyOptional({ description: 'Physical format', example: 'Paperback', nullable: true })
  @IsOptional()
  @IsString()
  physical_format?: string | null;

  @ApiPropertyOptional({ description: 'Dimensions', example: '20 x 13 x 2 cm', nullable: true })
  @IsOptional()
  @IsString()
  dimensions?: string | null;

  @ApiPropertyOptional({ description: 'Artist for albums', example: 'Daft Punk', nullable: true })
  @IsOptional()
  @IsString()
  artist?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Tracks for albums', example: ['Track 1', 'Track 2'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tracks?: string[] | null;

  @ApiPropertyOptional({ description: 'Duration in minutes', example: 120, nullable: true })
  @IsOptional()
  @IsNumber()
  duration?: number | null;

  @ApiPropertyOptional({ description: 'Total duration for albums', example: 3600, nullable: true })
  @IsOptional()
  @IsNumber()
  total_duration?: number | null;
}

export class CreateContentDto {
  @ApiProperty({ description: 'Title of the content', example: 'War of the Worlds', nullable: true })
  @IsString()
  title: string | null;

  @ApiPropertyOptional({ description: 'Original title', example: 'La Guerre des mondes', nullable: true })
  @IsOptional()
  @IsString()
  title_vo?: string | null;

  @ApiProperty({ enum: ['movie', 'book', 'game', 'album'], description: 'Type of content', example: 'book', nullable: true })
  @IsEnum(['movie', 'book', 'game', 'album'])
  type: string | null;

  @ApiPropertyOptional({ description: 'Description', example: 'A classic science fiction novel.', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Original description', example: 'Un roman de science-fiction classique.', nullable: true })
  @IsOptional()
  @IsString()
  description_vo?: string | null;

  @ApiPropertyOptional({ description: 'Release date', type: String, format: 'date', example: '2025-01-16T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  release_date?: Date | null;

  @ApiPropertyOptional({ type: [String], description: 'Genres', example: ['Science Fiction', 'Adventure'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[] | null;

  @ApiPropertyOptional({ type: MetadataDto, description: 'Metadata specific to the content type', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto | null;

  @ApiPropertyOptional({ description: 'Number of likes', example: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  likes_count?: number | null;

  @ApiPropertyOptional({ description: 'Average rating', example: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  average_rating?: number | null;

  @ApiPropertyOptional({ description: 'Number of reviews', example: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  reviews_count?: number | null;

  @ApiPropertyOptional({ description: 'Number of comments', example: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  comments_count?: number | null;

  @ApiPropertyOptional({ description: 'Image URL', example: 'https://example.com/image.jpg', nullable: true })
  @IsOptional()
  @IsString()
  image_url?: string | null;
}

export class TopRatedContentsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Content type filter', enum: ['movie', 'book', 'game', 'album'], example: 'movie' })
  @IsOptional()
  @IsEnum(['movie', 'book', 'game', 'album'])
  type?: string;
}
