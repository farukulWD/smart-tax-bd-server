import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  otpSendLimiter,
  otpVerifyLimiter,
  otpIpLimiter,
} from '../../middlewares/rateLimiter';
import { AuthControllers } from './auth.controller';
import { AuthValidation } from './auth.validation';
import { USER_ROLE } from '../users/user.constant';

const router = express.Router();

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.loginUser,
);

router.post(
  '/change-password',
  // auth(
  //   USER_ROLE.superAdmin,
  //   USER_ROLE.admin,
  //   USER_ROLE.faculty,
  //   USER_ROLE.student,
  // ),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthControllers.changePassword
);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthControllers.refreshToken
);

router.post(
  '/forget-password',
  otpIpLimiter,
  otpSendLimiter,
  validateRequest(AuthValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);

router.post(
  '/verify-forgot-otp',
  otpVerifyLimiter,
  validateRequest(AuthValidation.verifyForgotOTPValidationSchema),
  AuthControllers.verifyForgotPasswordOTP,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

router.post(
  '/logout',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user),
  AuthControllers.logoutUser
);

export const AuthRoutes = router;
