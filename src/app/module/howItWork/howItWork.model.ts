import { Schema, model } from 'mongoose';
import { IHowItWork, IHowItWorkSection } from './howItWork.interface';

const howItWorkSchema = new Schema<IHowItWork>(
  {
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

howItWorkSchema.index({ isActive: 1, order: 1 });

export const HowItWork = model<IHowItWork>('HowItWork', howItWorkSchema);

const howItWorkSectionSchema = new Schema<IHowItWorkSection>(
  {
    badge: {
      type: String,
      trim: true,
    },
    titlePrefix: {
      type: String,
      required: true,
      trim: true,
    },
    titleHighlight: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export const HowItWorkSection = model<IHowItWorkSection>(
  'HowItWorkSection',
  howItWorkSectionSchema,
);
