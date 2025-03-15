import { Injectable } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../../../common/constants/auth.constants';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  generateOtp(): string {
    return crypto
      .randomInt(0, Math.pow(10, AUTH_CONSTANTS.OTP.CODE_LENGTH))
      .toString()
      .padStart(AUTH_CONSTANTS.OTP.CODE_LENGTH, '0');
  }

  async createOtpRecord(email: string, otp: string): Promise<void> {
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.OTP.EXPIRATION_TIME);

    await this.prisma.otpVerification.create({
      data: {
        id: crypto.randomUUID(),
        email,
        otp,
        expiresAt,
        attempts: 0,
      },
    });
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        otp,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      // Increment attempts if record exists but OTP doesn't match
      await this.prisma.otpVerification.updateMany({
        where: {
          email,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });
      return false;
    }

    if (otpRecord.attempts >= AUTH_CONSTANTS.OTP.MAX_ATTEMPTS) {
      return false;
    }

    // Delete the OTP record after successful verification
    await this.prisma.otpVerification.delete({
      where: {
        id: otpRecord.id,
      },
    });

    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    await this.prisma.otpVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
