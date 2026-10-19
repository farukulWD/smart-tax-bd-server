import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from './user.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TUser } from './user.interface';
import config from '../../config';
import { sendOTP, verifyOTP } from '../../utils/otpService';
import { issueAuthTokens } from '../Auth/auth.service';
import { notificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE } from '../notifications/notification.constant';

const createUserIntoDb = async (payload: TUser, appHash?: string) => {
  const existingUser = await User.findOne({
    $or: [
      { mobile: payload.mobile },
      ...(payload.email ? [{ email: payload.email }] : []),
    ],
  });

  if (existingUser) {
    // Resume an abandoned signup: same mobile, phone never verified — resend OTP
    // instead of rejecting so the user can complete verification.
    if (
      existingUser.mobile === payload.mobile &&
      !existingUser.isMobileVerify
    ) {
      await sendOTP(existingUser.mobile, appHash);
      return existingUser;
    }

    throw new AppError(httpStatus.BAD_REQUEST, 'The user already created');
  }

  // create a user (unverified until the OTP is confirmed)
  payload.role = 'user';
  const newUser = await User.create(payload);

  // Send the verification OTP. If this fails the account exists but stays
  // unverified — the user can re-trigger it via resend / re-register.
  await sendOTP(newUser.mobile, appHash);

  notificationService
    .sendNotification({
      recipientId: (newUser._id as string).toString(),
      type: NOTIFICATION_TYPE.USER_REGISTERED,
      title: 'Welcome to Smart Tax BD!',
      message: `Hi ${newUser.name}, your account has been created successfully.`,
      data: { userId: newUser._id },
    })
    .catch(() => {});

  return newUser;
};

// Verify the signup OTP, mark the phone as verified and log the user in.
const verifyRegisterOTP = async (mobile: string, otp: string) => {
  const user = await User.findOne({ mobile });

  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No account found with this mobile number',
    );
  }

  if (user.isMobileVerify) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This mobile number is already verified',
    );
  }

  // throws AppError on wrong / expired OTP; deletes entry on success (one-time use)
  await verifyOTP(mobile, otp);

  user.isMobileVerify = true;
  await User.findByIdAndUpdate(user._id, { isMobileVerify: true });

  const { accessToken, refreshToken } = await issueAuthTokens(user);
  user.accessToken = '';

  return { accessToken, refreshToken, user };
};

// Resend the signup OTP (per-number cooldown enforced inside sendOTP).
const resendRegisterOTP = async (mobile: string, appHash?: string) => {
  const user = await User.findOne({ mobile });

  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No account found with this mobile number',
    );
  }

  if (user.isMobileVerify) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This mobile number is already verified',
    );
  }

  await sendOTP(mobile, appHash);

  return null;
};

const updateUser = async (mobile: string, data: TUser) => {
  const isExititng = await User.userFind({ mobile: mobile });

  if (!isExititng) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  const res = await User.findOneAndUpdate({ mobile: mobile }, data, {
    new: true,
  });

  return res;
};
const getUsers = async () => {
  const res = await User.find();

  return res;
};
const getMe = async (token: string) => {
  const decoded = jwt.verify(
    token,
    config.jwt_access_secret as string,
  ) as JwtPayload;

  const res = await User.findById({ _id: decoded?.userId });

  return res;
};
const getAUser = async (mobile: string) => {
  if (!mobile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Mobile number is required');
  }
  const res = await User.findOne({ mobile });

  return res;
};

export const UserServices = {
  createUserIntoDb,
  verifyRegisterOTP,
  resendRegisterOTP,
  updateUser,
  getUsers,
  getMe,
  getAUser,
};
