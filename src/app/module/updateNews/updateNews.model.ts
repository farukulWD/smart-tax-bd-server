import { model, Schema } from 'mongoose';
import { IUpdateNews } from './updateNews.interface';

const updateNewsSchema = new Schema<IUpdateNews>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    attachment: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const UpdateNews = model<IUpdateNews>('UpdateNews', updateNewsSchema);
