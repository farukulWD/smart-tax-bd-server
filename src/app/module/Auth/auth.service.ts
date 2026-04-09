import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../../errors/AppError';
import { sendEmail } from '../../utils/sendEmail';
import { TLoginUser } from './auth.interface';
import { createToken, verifyToken } from './auth.utils';
import { User } from '../users/user.model';

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

  await User.findOneAndUpdate(
    {
      mobile: mobile,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    },
  );

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

const forgetPassword = async (payload: TLoginUser) => {
  // checking if the user is exist
  const { mobile, email } = payload;

  if (!mobile) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Mobile no is required for forget password',
    );
  }

  const user = await User.findOne({
    mobile,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  const jwtPayload = {
    userId: user._id,
    role: user.role,
    email: user.email,
  };

  const resetToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '10m',
  );
};

const resetPassword = async (payload: {
  newPassword: string;
  token: string;
}) => {
  // checking if the user is exist
  const decoded = jwt.verify(
    payload.token,
    config.jwt_access_secret as string,
  ) as JwtPayload;

  const user = await User.findOne({ email: decoded.email });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }
  // checking if the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === 'inactive') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is inactive ! !');
  }

  //hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await User.findOneAndUpdate(
    {
      email: decoded.email,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    },
  );
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
  resetPassword,
  logoutUser,
};
