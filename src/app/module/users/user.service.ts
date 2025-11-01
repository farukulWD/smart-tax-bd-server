import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from './user.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TUser } from './user.interface';
import config from '../../config';

const createUserIntoDb = async (payload: TUser) => {
  try {
    console.log(payload);
    const existingUser = await User.findOne({ mobile: payload.mobile });

    if (existingUser) {
      throw new AppError(httpStatus.BAD_REQUEST, 'The user already created');
    }

    // create a user (transaction-1)

    payload.role = 'user';
    const newUser = await User.create(payload);
    return newUser;
  } catch (err: any) {
    throw new Error(err);
  }
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
    config.jwt_access_secret as string
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
  updateUser,
  getUsers,
  getMe,
  getAUser,
};
