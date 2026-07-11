import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewService } from './review.service';

const upsertMyReview = catchAsync(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const result = await ReviewService.upsertMyReviewToDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review submitted successfully',
    data: result,
  });
});

const getMyReview = catchAsync(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const result = await ReviewService.getMyReviewFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review fetched successfully',
    data: result,
  });
});

const getPublicReviews = catchAsync(async (req, res) => {
  const result = await ReviewService.getPublicReviewsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getAllReviewsAdmin = catchAsync(async (req, res) => {
  const result = await ReviewService.getAllReviewsAdminFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const createReviewAdmin = catchAsync(async (req, res) => {
  const result = await ReviewService.createReviewAdminToDB(
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review created successfully',
    data: result,
  });
});

const updateReviewAdmin = catchAsync(async (req, res) => {
  const result = await ReviewService.updateReviewAdminInDB(
    req.params.id as string,
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review updated successfully',
    data: result,
  });
});

const deleteReviewAdmin = catchAsync(async (req, res) => {
  const result = await ReviewService.deleteReviewAdminFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review deleted successfully',
    data: result,
  });
});

export const ReviewController = {
  upsertMyReview,
  getMyReview,
  getPublicReviews,
  getAllReviewsAdmin,
  createReviewAdmin,
  updateReviewAdmin,
  deleteReviewAdmin,
};
