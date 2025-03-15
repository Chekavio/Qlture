import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: "The verification token sent to the user's email",
    example: '123456',
  })
  @IsString()
  token: string;
}
