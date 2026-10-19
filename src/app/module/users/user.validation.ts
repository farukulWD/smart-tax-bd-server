import { z } from 'zod';
import { APP_HASH_REGEX } from '../../utils/otpService';

// Enum values for role and status
const UserRoleEnum = z.enum(['superAdmin', 'user', 'admin']);
const UserStatusEnum = z.enum(['active', 'inactive']);

// Zod Schema
const userValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    mobile: z.string().min(10, { message: 'Mobile number is required' }),
    password: z
      .string()
      .min(4, { message: 'Password must be at least 4 characters long' }),
    email: z.string().email({ message: 'Invalid email address' }).optional(),
    appHash: z.string().regex(APP_HASH_REGEX).optional(),
  }),
});

// Signup OTP: verify { mobile, otp }
const verifyRegisterOtpSchema = z.object({
  body: z.object({
    mobile: z.string().min(10, { message: 'Mobile number is required' }),
    otp: z.string().min(6, { message: 'OTP must be 6 digits' }),
  }),
});

// Signup OTP: resend { mobile, appHash? }
const resendRegisterOtpSchema = z.object({
  body: z.object({
    mobile: z.string().min(10, { message: 'Mobile number is required' }),
    appHash: z.string().regex(APP_HASH_REGEX).optional(),
  }),
});

// For use in request validation middleware
export {
  userValidationSchema,
  verifyRegisterOtpSchema,
  resendRegisterOtpSchema,
};
