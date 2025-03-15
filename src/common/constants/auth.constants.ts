export const AUTH_CONSTANTS = {
  JWT: {
    ACCESS_TOKEN_EXPIRATION: '15m',
    REFRESH_TOKEN_EXPIRATION: '7d',
  },
  OTP: {
    CODE_LENGTH: 6,
    EXPIRATION_TIME: 10 * 60 * 1000, // 10 minutes in milliseconds
    MAX_ATTEMPTS: 3,
  },
  ROUTES: {
    PUBLIC: [
      '/auth/signup',
      '/auth/signin',
      '/auth/verify-otp',
      '/auth/refresh-token',
      '/auth/forgot-password',
      '/auth/reset-password',
    ],
  },
};
