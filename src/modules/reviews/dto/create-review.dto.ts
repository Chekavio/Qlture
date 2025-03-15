import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 4.5, minimum: 0.5, maximum: 5, description: 'Note de la review' })
  @IsNumber()
  @Min(0.5)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Un chef-d’œuvre visuel et narratif',
    required: false,
    description: 'Commentaire facultatif',
  })
  @IsOptional()
  @IsString()
  reviewText?: string;

  @ApiProperty({ example: '65f1e19e1c92be6ad77f52f1', description: 'ID du contenu' })
  @IsString()
  contentId: string;
}
