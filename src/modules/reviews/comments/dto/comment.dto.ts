import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty({
    description: 'Contenu du commentaire',
    example: 'Super review ! Merci ',
  })
  @IsString()
  comment: string;

  @ApiPropertyOptional({
    description: 'ID du commentaire auquel on répond (si réponse à un commentaire)',
    example: '60f7f8e2f9a1e8a3f1b23456',
  })
  @IsOptional()
  @IsString()
  replyToCommentId?: string;
}
