import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import { IReview } from './review.interface';
import { Review } from './review.model';
import { User } from '../users/user.model';

const upsertMyReviewToDB = async (
  userId: string,
  payload: Partial<IReview>,
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const result = await Review.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      reviewerName: user.name,
      rating: payload.rating,
      comment: payload.comment,
      status: 'pending',
    },
    { upsert: true, new: true },
  );
  return result;
};

const getMyReviewFromDB = async (userId: string) => {
  const result = await Review.findOne({ user: userId });
  return result;
};

const getPublicReviewsFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 12;
  const skip = (page - 1) * limit;

  const filter = { status: 'approved' };

  const [data, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    data,
    meta: { limit, page, total, totalPage: Math.ceil(total / limit) },
  };
};

const getAllReviewsAdminFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const search = new RegExp(String(query.search), 'i');
    filter.$or = [{ reviewerName: search }, { comment: search }];
  }

  const [data, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    data,
    meta: { limit, page, total, totalPage: Math.ceil(total / limit) },
  };
};

const createReviewAdminToDB = async (
  payload: Partial<IReview>,
  file?: Express.Multer.File,
) => {
  if (file) {
    const uploadResult = await sendImageToCloudinary(
      `review-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    payload.reviewerPhoto = uploadResult.secure_url as string;
  }

  payload.status = payload.status ?? 'approved';

  const result = await Review.create(payload);
  return result;
};

const updateReviewAdminInDB = async (
  id: string,
  payload: Partial<IReview>,
  file?: Express.Multer.File,
) => {
  const isExist = await Review.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  if (file) {
    const uploadResult = await sendImageToCloudinary(
      `review-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    payload.reviewerPhoto = uploadResult.secure_url as string;
  }

  const result = await Review.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteReviewAdminFromDB = async (id: string) => {
  const isExist = await Review.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }
  const result = await Review.findByIdAndDelete(id);
  return result;
};

export const ReviewService = {
  upsertMyReviewToDB,
  getMyReviewFromDB,
  getPublicReviewsFromDB,
  getAllReviewsAdminFromDB,
  createReviewAdminToDB,
  updateReviewAdminInDB,
  deleteReviewAdminFromDB,
};
