import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { Otp } from '../module/otp/otp.model';
import { formatBDPhone, sendSMS } from './smsService';

// ---------------------------------------------------------------------------
// Store: MongoDB `otps` collection (shared across instances, TTL-cleaned).
// A TTL index on `expiresAt` lets Mongo auto-delete expired codes; the manual
// expiry checks below still gate correctness (TTL sweep only runs ~every 60s).
// ---------------------------------------------------------------------------

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
 * Enforces a per-number cooldown: while a previous OTP is still valid (within
 * the 5-minute TTL) a new one cannot be requested — the caller must wait for it
 * to expire. This satisfies "resend after 5 minutes per number".
 */
export const generateOTP = async (phone: string): Promise<string> => {
  const mobile = formatBDPhone(phone); // validates and normalises

  const existing = await Otp.findOne({ phone: mobile });
  if (existing && Date.now() < existing.expiresAt.getTime()) {
    const secondsLeft = Math.ceil(
      (existing.expiresAt.getTime() - Date.now()) / 1000,
    );
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS, // 429
      `Please wait ${secondsLeft}s before requesting a new code`,
    );
  }

  const otp = randomOTP();
  const hash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

  // Upsert so an expired entry is overwritten atomically (unique index on phone).
  await Otp.findOneAndUpdate(
    { phone: mobile },
    { hash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    { upsert: true, new: true },
  );

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
  const entry = await Otp.findOne({ phone: mobile });

  if (!entry) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No OTP was requested for this phone number',
    );
  }

  if (Date.now() > entry.expiresAt.getTime()) {
    await Otp.deleteOne({ phone: mobile });
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
  await Otp.deleteOne({ phone: mobile });
};
