import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AUTH_CONSTANTS } from '../../../common/constants/auth.constants';

@Injectable()
export class EmailService {
  private transporter: any;

  constructor(private configService: ConfigService) {
    const config = this.configService.get('smtp');
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
      debug: true,
    });

    this.transporter.verify((error) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('SMTP server is ready to take our messages');
      }
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: {
          name: 'Qlture',
          address: this.configService.get('smtp.from'),
        },
        to: email,
        subject: 'Your Verification Code',
        html: `
          <h1>Welcome to Qlture!</h1>
          <p>Your verification code is:</p>
          <h2 style="font-size: 24px; padding: 10px; background-color: #f5f5f5; text-align: center;">${otp}</h2>
          <p>This code will expire in ${AUTH_CONSTANTS.OTP.EXPIRATION_TIME / 60000} minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    try {
      const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${token}`;

      const mailOptions = {
        from: {
          name: 'Qlture',
          address: this.configService.get('smtp.from'),
        },
        to: email,
        subject: 'Reset your password',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
