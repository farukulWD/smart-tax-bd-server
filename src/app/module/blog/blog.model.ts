import { Schema, model } from 'mongoose';
import { BLOG_STATUS, IBlog } from './blog.interface';

const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
    },
    tags: {
      type: [String],
      default: [],
    },
    authorName: {
      type: String,
      default: 'Smart Tax BD',
      trim: true,
    },
    status: {
      type: String,
      enum: BLOG_STATUS,
      default: 'draft',
    },
    publishedAt: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ status: 1, category: 1 });

export const Blog = model<IBlog>('Blog', blogSchema);
