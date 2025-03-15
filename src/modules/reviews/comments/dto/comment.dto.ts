import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CommentDto {
  @ApiProperty({ example: 'Totalement d’accord avec toi !' })
  @IsString()
  comment: string;
}
