import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOAuth2,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
@ApiBearerAuth('JWT-auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup/initiate')
  @ApiOperation({ summary: 'Initiate user registration' })
  @ApiResponse({ status: 201, description: 'Registration initiated, OTP sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: SignUpDto })
  async initiateSignUp(@Body() signUpDto: SignUpDto) {
    return this.authService.initiateSignUp(signUpDto);
  }

  @Public()
  @Post('signup/verify')
  @ApiOperation({ summary: 'Verify OTP and complete registration' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtpAndCreateAccount(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtpAndCreateAccount(verifyOtpDto);
  }

  @Public()
  @Post('signin')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: SignInDto })
  async signIn(@Body() signInDto: SignInDto, @Res() res: Response) {
    const result = await this.authService.signIn(signInDto);

    // Set refresh token in HTTP-only cookie
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Don't send refresh token in response body
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...responseData } = result;
    return res.status(HttpStatus.OK).json(responseData);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Req() req, @Res() res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Refresh token not found',
      });
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    // Set refresh token in HTTP-only cookie
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(HttpStatus.OK).json({
      access_token: tokens.access_token,
    });
  }

  @Public()
  @Post('reset-password/request')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset password email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.initiatePasswordReset(email);
  }

  @Public()
  @Post('reset-password/confirm')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Sign in with Google' })
  @ApiOAuth2(['email', 'profile'])
  @ApiResponse({ status: 200, description: 'Redirects to Google login' })
  async googleAuth() {
    // Guard will handle the authentication
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated with Google',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async googleAuthCallback(@Req() req) {
    return this.authService.validateOAuthUser(req.user, 'google');
  }
}
