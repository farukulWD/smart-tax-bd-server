import { z } from 'zod';
import { REVIEW_STATUS } from './review.interface';

const reviewStatusEnum = z.enum(REVIEW_STATUS);

const upsertMyReviewValidationSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().min(1, { message: 'Comment is required' }),
  }),
});

const createReviewValidationSchema = z.object({
  body: z.object({
    reviewerName: z.string().min(1, { message: 'Reviewer name is required' }),
    rating: z.number().min(1).max(5),
    comment: z.string().min(1, { message: 'Comment is required' }),
    status: reviewStatusEnum.optional(),
  }),
});

const updateReviewValidationSchema = z.object({
  body: z.object({
    reviewerName: z.string().min(1).optional(),
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().min(1).optional(),
    status: reviewStatusEnum.optional(),
  }),
});

export const ReviewValidation = {
  upsertMyReviewValidationSchema,
  createReviewValidationSchema,
  updateReviewValidationSchema,
};
