import { z } from 'zod';
import { BLOG_STATUS } from './blog.interface';

const blogStatusEnum = z.enum(BLOG_STATUS);

const createBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    content: z.string().min(1, { message: 'Content is required' }),
    excerpt: z.string().optional(),
    category: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    authorName: z.string().optional(),
    status: blogStatusEnum.optional(),
  }),
});

const updateBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    excerpt: z.string().optional(),
    category: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    authorName: z.string().optional(),
    status: blogStatusEnum.optional(),
  }),
});

export const BlogValidation = {
  createBlogValidationSchema,
  updateBlogValidationSchema,
};
