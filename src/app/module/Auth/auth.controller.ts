import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from './auth.utils';

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  const { refreshToken, accessToken, user } = result;

  // The web clients keep using the httpOnly cookie...
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User is logged in successfully!',
    data: {
      accessToken,
      // ...while the mobile app keeps its own copy in the device keystore,
      // because a React Native cookie jar is not durable enough to hold a
      // session across restarts and OS updates.
      refreshToken,
      user,
    },
  });
});

const changePassword = catchAsync(async (req, res) => {
  const passwordData = req.body;
  const mobile = req.query.mobile as string;
  const result = await AuthServices.changePassword(mobile, passwordData);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password is updated successfully!',
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  // Web sends the cookie, the mobile app sends the token it stored at login.
  const token: string | undefined =
    req.body?.refreshToken || req.cookies?.refreshToken;

  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Refresh token is required!');
  }

  const result = await AuthServices.refreshToken(token);

  // Rotating on every refresh restarts the 365-day window, so an active user's
  // session never lapses on its own.
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    result.refreshToken,
    refreshCookieOptions(),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token is retrieved successfully!',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  await AuthServices.forgetPassword(req.body.mobile);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP sent to your mobile number',
    data: null,
  });
});

const verifyForgotPasswordOTP = catchAsync(async (req, res) => {
  const { mobile, otp } = req.body;
  const result = await AuthServices.verifyForgotPasswordOTP(mobile, otp);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP verified. Use the reset token to set a new password.',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successfully!',
    data: null,
  });
});

const logoutUser = catchAsync(async (req, res) => {
  const mobile = req.user?.mobile;

  await AuthServices.logoutUser(mobile as string);

  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(false));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged out successfully!',
    data: null,
  });
});

export const AuthControllers = {
  loginUser,
  changePassword,
  refreshToken,
  forgetPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  logoutUser,
};
