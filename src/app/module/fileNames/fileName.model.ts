import { Schema, model } from 'mongoose';
import { IFileName, IFileNameLabel } from './fileName.interface';

const labelSchema = new Schema<IFileNameLabel>(
  {
    en: { type: String, required: true, trim: true },
    bn: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const fileNameSchema = new Schema<IFileName>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: labelSchema,
      required: true,
    },
    isCommon: {
      type: Boolean,
      default: false,
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

fileNameSchema.index({ isActive: 1, order: 1 });

export const FileName = model<IFileName>('FileName', fileNameSchema);
