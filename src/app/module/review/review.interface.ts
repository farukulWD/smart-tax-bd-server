import { Document, Types } from 'mongoose';

export const REVIEW_STATUS = ['pending', 'approved', 'rejected'] as const;

export type TReviewStatus = (typeof REVIEW_STATUS)[number];

export interface IReview extends Document {
  user?: Types.ObjectId;
  reviewerName: string;
  reviewerPhoto?: string;
  rating: number;
  comment: string;
  status: TReviewStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
