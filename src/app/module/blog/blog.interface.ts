import { Document } from 'mongoose';

export const BLOG_STATUS = ['draft', 'published'] as const;

export type TBlogStatus = (typeof BLOG_STATUS)[number];

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  category: string;
  tags: string[];
  authorName: string;
  status: TBlogStatus;
  publishedAt?: Date;
  views: number;
  createdAt?: Date;
  updatedAt?: Date;
}
