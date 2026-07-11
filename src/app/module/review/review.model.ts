import { Schema, model } from 'mongoose';
import { REVIEW_STATUS, IReview } from './review.interface';

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    reviewerPhoto: {
      type: String,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: REVIEW_STATUS,
      default: 'pending',
    },
  },
  { timestamps: true },
);

// one review per registered user; admin freeform reviews (user: null) are unrestricted
reviewSchema.index({ user: 1 }, { unique: true, sparse: true });
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model<IReview>('Review', reviewSchema);
