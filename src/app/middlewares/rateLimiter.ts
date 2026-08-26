import { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import httpStatus from 'http-status';

/**
 * Rate-limit rejections bypass the global error handler, so they build the same
 * `{ success, message, errorSources }` envelope here — clients read the message
 * out of `errorSources` and would otherwise show a generic "unknown error".
 */
const rejectWith = (message: string) => (_req: Request, res: Response) => {
  res.status(httpStatus.TOO_MANY_REQUESTS).json({
    success: false,
    message,
    errorSources: [{ path: '', message }],
  });
};

/**
 * OTP abuse is abuse of one phone number, so the limit is keyed on the number
 * the OTP is going to. Keying on the IP instead punishes shared addresses:
 * BD carriers run CGNAT and an office shares one WiFi, so a handful of genuine
 * signups from the same building used up the whole allowance.
 * Falls back to the IP when the body carries no number.
 */
const mobileKey = (req: Request): string => {
  const mobile = String(req.body?.mobile ?? '').replace(/\D/g, '');
  return mobile ? `mobile:${mobile}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;
};

/**
 * OTP send limit — 3 delivered OTPs per 15 minutes per phone number.
 * Prevents SMS bombing / abuse of the SMS API credit.
 *
 * `skipFailedRequests` makes the allowance count SMS actually sent rather than
 * requests received. Without it an impatient user tapping "resend" four times
 * inside a minute burnt the whole budget on replies the OTP cooldown had
 * already refused, locking their number for 15 minutes over a single SMS.
 * Nothing here sends an SMS and then fails — `sendOTP` is the last awaited call
 * on every path — so a skipped request never hides a delivered message.
 */
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: mobileKey,
  handler: rejectWith(
    'Too many OTP requests for this number. Please wait 15 minutes before trying again.',
  ),
});

/**
 * OTP verify limit — 5 attempts per 15 minutes per phone number.
 * A 6-digit OTP has 1,000,000 combinations; 5 attempts makes brute-force infeasible.
 * Deliberately counts failed requests: a wrong code IS the attempt to cap, so
 * `skipFailedRequests` must never be set here.
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: mobileKey,
  handler: rejectWith(
    'Too many incorrect attempts. Please wait 15 minutes before trying again.',
  ),
});

/**
 * Backstop for the number-keyed limits above: one attacker cycling through many
 * numbers stays under every per-number limit while still draining SMS credit.
 * Mounted only on the routes that actually send an SMS — the verify routes cost
 * nothing to serve and are already capped per number, so counting them here just
 * halved how many genuine signups one office or CGNAT address could complete.
 */
export const otpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: false,
  legacyHeaders: false,
  handler: rejectWith(
    'Too many requests from this network. Please wait 15 minutes before trying again.',
  ),
});
