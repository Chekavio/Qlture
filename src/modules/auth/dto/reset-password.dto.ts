import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The password reset token',
    example: '123456',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'The new password',
    example: 'newPassword123',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
