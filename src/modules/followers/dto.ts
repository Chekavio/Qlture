import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FollowDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur qui suit',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  follower_id: string;

  @ApiProperty({
    description: 'ID de l\'utilisateur suivi',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  following_id: string;
}
