import httpStatus from 'http-status';
import { UserServices } from './user.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import {
  REFRESH_TOKEN_COOKIE,
  refreshCookieOptions,
} from '../Auth/auth.utils';

const createUser = catchAsync(async (req, res) => {
  // appHash only shapes the OTP SMS; it is not a user field.
  const { appHash, ...userData } = req.body;

  const result = await UserServices.createUserIntoDb(userData, appHash);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User created success',
    data: result,
  });
});

const verifyRegisterOtp = catchAsync(async (req, res) => {
  const { mobile, otp } = req.body;

  const result = await UserServices.verifyRegisterOTP(mobile, otp);

  // Verification logs the user in, same as /auth/login.
  res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Mobile number verified successfully',
    data: result,
  });
});

const resendRegisterOtp = catchAsync(async (req, res) => {
  const { mobile, appHash } = req.body;

  const result = await UserServices.resendRegisterOTP(mobile, appHash);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP sent successfully',
    data: result,
  });
});

const getUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getUsers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Fetched  success',
    data: result,
  });
});
const getMe = catchAsync(async (req, res) => {
  const token = req.headers.authorization;

  const result = await UserServices.getMe(token as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Fetched  success',
    data: result,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const data = req.body;

  const mobile = req.params.mobile as string;
  const result = await UserServices.updateUser(mobile, data);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User updated success',
    data: result,
  });
});
const getUser = catchAsync(async (req, res) => {
  const mobile = req.params.mobile as string;

  const result = await UserServices.getAUser(mobile);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Fetched  success',
    data: result,
  });
});

export const UserControllers = {
  createUser,
  verifyRegisterOtp,
  resendRegisterOtp,
  updateUser,
  getUsers,
  getMe,
  getUser,
};
