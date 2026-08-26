import { Schema, model } from 'mongoose';
import { IIncomeSource, IIncomeSourceTitle } from './incomeSource.interface';

const titleSchema = new Schema<IIncomeSourceTitle>(
  {
    en: { type: String, required: true, trim: true },
    bn: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const incomeSourceSchema = new Schema<IIncomeSource>(
  {
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: titleSchema,
      required: true,
    },
    required_files: [
      {
        type: Schema.Types.ObjectId,
        ref: 'FileName',
      },
    ],
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

incomeSourceSchema.index({ isActive: 1, order: 1 });

export const IncomeSourceModel = model<IIncomeSource>(
  'IncomeSource',
  incomeSourceSchema,
);
