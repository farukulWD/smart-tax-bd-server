import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { formatBDPhone, sendSMS } from './smsService';

// ---------------------------------------------------------------------------
// In-memory store  (swap for Redis in production for multi-instance deployments)
// ---------------------------------------------------------------------------

type OTPEntry = {
  hash: string;
  expiresAt: number; // Unix ms
};

const otpStore = new Map<string, OTPEntry>();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OTP_DIGITS = 6;
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BCRYPT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randomOTP = (): string =>
  Math.floor(Math.random() * 10 ** OTP_DIGITS)
    .toString()
    .padStart(OTP_DIGITS, '0');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a plain-text OTP, hash it, and persist it for the given phone.
 * Calling again before expiry overwrites the previous entry.
 */
export const generateOTP = async (phone: string): Promise<string> => {
  const mobile = formatBDPhone(phone); // validates and normalises
  const otp = randomOTP();
  const hash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

  otpStore.set(mobile, {
    hash,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  return otp;
};

/**
 * Generate an OTP for `phone`, then dispatch it via SMS.
 * Throws if the phone is invalid or the SMS API call fails.
 */
export const sendOTP = async (phone: string): Promise<void> => {
  const otp = await generateOTP(phone);
  const message = `Your Smart Tax BD OTP is: ${otp}. Valid for 5 minutes. Do not share it with anyone.`;
  await sendSMS(phone, message);
};

/**
 * Verify the OTP supplied by the user.
 * - Throws 400 if the phone was never issued an OTP.
 * - Throws 410 if the OTP has expired.
 * - Throws 400 if the OTP is wrong.
 * - Deletes the stored entry on successful verification (one-time use).
 */
export const verifyOTP = async (phone: string, otp: string): Promise<void> => {
  const mobile = formatBDPhone(phone);
  const entry = otpStore.get(mobile);

  if (!entry) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No OTP was requested for this phone number',
    );
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(mobile);
    throw new AppError(
      httpStatus.GONE,                     // 410
      'OTP has expired. Please request a new one.',
    );
  }

  const isMatch = await bcrypt.compare(otp, entry.hash);
  if (!isMatch) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Incorrect OTP');
  }

  // Consumed — remove immediately (one-time use)
  otpStore.delete(mobile);
};
