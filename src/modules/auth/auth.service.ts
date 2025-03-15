import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from './services/email.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { IUser } from '../../common/interfaces/user.interface';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private tokenService: TokenService,
    private otpService: OtpService,
    private userService: UserService,
  ) {}

  async initiateSignUp(signUpDto: SignUpDto): Promise<{ message: string }> {
    const { email, username } = signUpDto;

    // Check if user exists using UserService
    const existingUserByEmail = await this.userService.findByEmail(email);
    const existingUserByUsername =
      await this.userService.findByUsername(username);

    if (existingUserByEmail || existingUserByUsername) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    // Generate and store OTP
    const otp = this.otpService.generateOtp();
    await this.otpService.createOtpRecord(email, otp);

    // Store signup data temporarily
    await this.prisma.pendingUser.create({
      data: {
        id: crypto.randomUUID(),
        ...signUpDto,
        password: hashedPassword,
      },
    });

    // Send OTP email
    await this.emailService.sendOtpEmail(email, otp);

    return { message: 'OTP sent to your email for verification' };
  }

  async verifyOtpAndCreateAccount(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ access_token: string; refresh_token: string; user: IUser }> {
    const { email, otp } = verifyOtpDto;

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(email, otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Get pending user data
    const pendingUser = await this.prisma.pendingUser.findUnique({
      where: { email },
    });

    if (!pendingUser) {
      throw new BadRequestException('No pending registration found');
    }

    // Create user with stats using UserService
    const user = await this.userService.create({
      email: pendingUser.email,
      username: pendingUser.username,
      password: pendingUser.password, // Already hashed from initiateSignUp
      firstName: pendingUser.firstName || '',
      lastName: pendingUser.lastName || '',
      provider: 'local',
      isActive: true,
      isEmailVerified: true,
      lastLogin: new Date(),
    });

    // Clean up pending user
    await this.prisma.pendingUser.delete({
      where: { email },
    });

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);
    return { ...tokens, user };
  }

  async signIn(
    signInDto: SignInDto,
  ): Promise<{ access_token: string; refresh_token: string; user: IUser }> {
    const { email, password } = signInDto;

    // Find user by email using UserService
    const user = await this.userService.findByEmailForAuth(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userService.update(user.id, { lastLogin: new Date() });

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);
    return { ...tokens, user };
  }

  async validateOAuthUser(
    profile: any,
    provider: string,
  ): Promise<{ access_token: string; refresh_token: string; user: IUser }> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new BadRequestException('Email is required from OAuth provider');
    }

    // Find user by email using UserService
    let user = await this.userService.findByEmail(email);

    if (!user) {
      // Create new user with UserService
      user = await this.userService.create({
        email,
        username: email.split('@')[0],
        password: '', // OAuth users don't have passwords
        provider,
        providerId: profile.id,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        avatar: profile.photos?.[0]?.value,
        isActive: true,
        isEmailVerified: true,
        lastLogin: new Date(),
      });
    } else {
      // Update last login and OAuth info if the user exists
      user = await this.userService.update(user.id, {
        lastLogin: new Date(),
        provider,
        providerId: profile.id,
      });
    }

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);
    return { ...tokens, user };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      // Verify the refresh token
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);

      // Get user
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      return this.tokenService.generateTokens(user);
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string): Promise<IUser> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return user;
  }

  async initiatePasswordReset(email: string): Promise<{ message: string }> {
    // Find user
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate reset token
    const { token: resetToken, expires } =
      this.tokenService.generatePasswordResetToken();

    // Store reset token with expiry
    await this.prisma.passwordReset.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        token: await bcrypt.hash(resetToken, 10),
        expiresAt: expires,
      },
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Password reset instructions sent to your email' };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find valid reset token
    const passwordReset = await this.prisma.passwordReset.findFirst({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        User: true,
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, passwordReset.token);
    if (!isValidToken) {
      throw new BadRequestException('Invalid reset token');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updatePassword(passwordReset.userId, hashedPassword);

    // Delete used reset token
    await this.prisma.passwordReset.delete({
      where: {
        id: passwordReset.id,
      },
    });

    return { message: 'Password successfully reset' };
  }
}