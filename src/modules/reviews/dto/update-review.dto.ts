import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ example: 3, required: false, minimum: 0.5, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5)
  rating?: number;

  @ApiProperty({ example: 'Un peu décevant comparé au précédent.', required: false })
  @IsOptional()
  @IsString()
  reviewText?: string;
}
