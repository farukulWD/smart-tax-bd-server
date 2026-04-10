import { z } from 'zod';

const loginValidationSchema = z.object({
  body: z.object({
    mobile: z.string({ required_error: 'User mobile is required.' }).optional(),
    email: z.string({ required_error: 'User email is required.' }).optional(),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({
      required_error: 'Old password is required',
    }),
    newPassword: z.string({ required_error: 'Password is required' }),
  }),
});

const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required!',
    }),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    mobile: z.string({ required_error: 'Mobile number is required!' }),
  }),
});

const verifyForgotOTPValidationSchema = z.object({
  body: z.object({
    mobile: z.string({ required_error: 'Mobile number is required!' }),
    otp: z.string({ required_error: 'OTP is required!' }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    resetToken: z.string({ required_error: 'Reset token is required!' }),
    newPassword: z.string({ required_error: 'New password is required!' }),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  changePasswordValidationSchema,
  refreshTokenValidationSchema,
  forgetPasswordValidationSchema,
  verifyForgotOTPValidationSchema,
  resetPasswordValidationSchema,
};
