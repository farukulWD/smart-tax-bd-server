import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../../errors/AppError';
import { sendOTP, verifyOTP } from '../../utils/otpService';
import { TLoginUser } from './auth.interface';
import { createToken, verifyToken } from './auth.utils';
import { User } from '../users/user.model';
import { notificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE } from '../notifications/notification.constant';

const loginUser = async (payload: TLoginUser) => {
  const { mobile, email } = payload;

  if (!mobile && !email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Mobile or Email is required for login',
    );
  }

  const conditions = [];
  if (mobile) conditions.push({ mobile });
  if (email) conditions.push({ email });

  const user = await User.findOne({
    $or: conditions,
  }).select('+password');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is blocked

  const userStatus = user?.status;

  if (userStatus === 'inactive') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is inactive !!');
  }

  // block login until the phone number has been verified via OTP.
  // Only applies to public 'user' accounts (admins are provisioned separately).
  if (user.role === 'user' && !user.isMobileVerify) {
    const verifyError = new AppError(
      httpStatus.FORBIDDEN,
      'Please verify your phone number',
    );
    verifyError.needsVerification = true;
    throw verifyError;
  }

  //checking if the password is correct

  if (!(await User.isPasswordMatched(payload?.password, user?.password)))
    throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched');

  //create token and sent to the  client

  if (!user._id) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'User ID is missing');
  }

  const jwtPayload = {
    userId: user._id,
    mobile: user?.mobile,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  await User.findByIdAndUpdate(user._id, { accessToken });
  user.password = '';
  user.accessToken = '';

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  return {
    accessToken,
    refreshToken,
    user,
  };
};

const changePassword = async (
  mobile: string,
  payload: { oldPassword: string; newPassword: string },
) => {
  // checking if the user is exist
  const user = await User.userFind({ mobile: mobile });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }
  // checking if the user is already deleted

  // checking if the user is blocked

  const userStatus = user?.status;

  if (userStatus === 'inactive') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is inactive ! !');
  }

  //checking if the password is correct

  if (!(await User.isPasswordMatched(payload.oldPassword, user?.password)))
    throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched');

  //hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updatedUser = await User.findOneAndUpdate(
    {
      mobile: mobile,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    },
  );

  if (updatedUser) {
    notificationService
      .sendNotification({
        recipientId: (updatedUser._id as string).toString(),
        type: NOTIFICATION_TYPE.PASSWORD_CHANGED,
        title: 'Password Changed',
        message: 'Your password has been changed successfully.',
        data: { userId: updatedUser._id },
      })
      .catch(() => {});
  }

  return null;
};

const refreshToken = async (token: string) => {
  // checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  const { mobile, iat } = decoded;

  // checking if the user is exist
  const user = await User.userFind({ mobile: mobile });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === 'inactive') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is inactive ! !');
  }

  if (
    user.passwordChangedAt &&
    User.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized !');
  }

  const jwtPayload = {
    userId: user?._id as string,
    mobile: user?.mobile,
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  return {
    accessToken,
  };
};

// Step 1 — verify account exists then dispatch OTP via SMS
const forgetPassword = async (mobile: string) => {
  if (!mobile) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Mobile number is required for forgot password',
    );
  }

  const user = await User.findOne({ mobile });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'No account found with this mobile number');
  }

  if (user.status === 'inactive') {
    throw new AppError(httpStatus.FORBIDDEN, 'This account is inactive');
  }

  await sendOTP(mobile);
};

// Step 2 — verify OTP; return a short-lived password-reset JWT on success
const verifyForgotPasswordOTP = async (mobile: string, otp: string) => {
  if (!mobile || !otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Mobile and OTP are required');
  }

  const user = await User.findOne({ mobile });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'No account found with this mobile number');
  }

  // throws AppError on wrong / expired OTP; deletes entry on success (one-time use)
  await verifyOTP(mobile, otp);

  const resetToken = createToken(
    { userId: user._id, mobile, role: user.role },
    config.jwt_access_secret as string,
    '10m',
  );

  return { resetToken };
};

// Step 3 — set new password using the short-lived reset token
const resetPassword = async (payload: { resetToken: string; newPassword: string }) => {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(
      payload.resetToken,
      config.jwt_access_secret as string,
    ) as JwtPayload;
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Reset token is invalid or has expired');
  }

  const user = await User.findOne({ mobile: decoded.mobile });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  if (user.status === 'inactive') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is inactive !');
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const resetUser = await User.findOneAndUpdate(
    { mobile: decoded.mobile },
    { password: newHashedPassword, passwordChangedAt: new Date() },
  );

  if (resetUser) {
    notificationService
      .sendNotification({
        recipientId: (resetUser._id as string).toString(),
        type: NOTIFICATION_TYPE.PASSWORD_RESET,
        title: 'Password Reset',
        message: 'Your password has been reset successfully.',
        data: { userId: resetUser._id },
      })
      .catch(() => {});
  }
};

const logoutUser = async (email: string) => {
  await User.findOneAndUpdate(
    {
      email: email,
    },
    {
      accessToken: null,
    },
  );
};

export const AuthServices = {
  loginUser,
  changePassword,
  refreshToken,
  forgetPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  logoutUser,
};
