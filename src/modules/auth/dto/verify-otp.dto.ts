import { IsString, IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_CONSTANTS } from '../../../common/constants/auth.constants';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'OTP code sent to email',
    example: '123456',
  })
  @IsString()
  @Length(AUTH_CONSTANTS.OTP.CODE_LENGTH, AUTH_CONSTANTS.OTP.CODE_LENGTH)
  otp: string;
}
