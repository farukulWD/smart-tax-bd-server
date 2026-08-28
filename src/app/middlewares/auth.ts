import httpStatus from 'http-status';
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';

import catchAsync from '../utils/catchAsync';
import { TUserRole } from '../module/users/user.interface';
import { User } from '../module/users/user.model';

const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    // checking if the token is missing
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    // console.log(token)

    // checking if the given token is valid.
    // Left unwrapped, an expired token throws a raw TokenExpiredError that the
    // global handler reports as a 500, so clients cannot tell an expired
    // session apart from a server fault and never trigger a refresh.
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as JwtPayload;
    } catch (error) {
      const expired = (error as Error)?.name === 'TokenExpiredError';
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        expired
          ? 'Session expired. Please sign in again.'
          : 'You are not authorized!',
      );
    }

    const { role, userId } = decoded;

    // checking if the user is exist
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
    }
    // checking if the user is already deleted

    // console.log(user);

    // checking if the user is blocked
    const userStatus = user?.status;

    if (userStatus === 'inactive') {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is inactive ! !');
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized !');
    }

    req.user = decoded as JwtPayload & { role: string };
    next();
  });
};

export default auth;
