import rateLimit from 'express-rate-limit';

/**
 * OTP send limit — 3 requests per 15 minutes per IP.
 * Prevents SMS bombing / abuse of the SMS API credit.
 */
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
  },
});

/**
 * OTP verify limit — 5 attempts per 15 minutes per IP.
 * A 6-digit OTP has 1,000,000 combinations; 5 attempts makes brute-force infeasible.
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many incorrect attempts. Please wait 15 minutes before trying again.',
  },
});
