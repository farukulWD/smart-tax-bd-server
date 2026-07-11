import { NextFunction, Request, Response, Router } from 'express';

import { USER_ROLE } from './user.constant';
import { upload } from '../../utils/sendImageToCloudinary';
import validateRequest from '../../middlewares/validateRequest';
import { UserControllers } from './user.controller';
import {
  userValidationSchema,
  verifyRegisterOtpSchema,
  resendRegisterOtpSchema,
} from './user.validation';
import { otpSendLimiter, otpVerifyLimiter } from '../../middlewares/rateLimiter';
import auth from '../../middlewares/auth';

const router = Router();

router.post(
  '/register',
  otpSendLimiter,
  validateRequest(userValidationSchema),
  UserControllers.createUser
);

router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validateRequest(verifyRegisterOtpSchema),
  UserControllers.verifyRegisterOtp
);

router.post(
  '/resend-otp',
  otpSendLimiter,
  validateRequest(resendRegisterOtpSchema),
  UserControllers.resendRegisterOtp
);

router.patch(
  '/update/:mobile',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  // validateRequest(userUpdateValidationSchema),
  UserControllers.updateUser
);
router.get(
  '/get-users',
  // auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  UserControllers.getUsers
);
router.get(
  '/get-user/:mobile',
  // auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user),
  UserControllers.getUser
);

router.get(
  '/get-me',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user),
  UserControllers.getMe
);
export const UserRoutes = router;
