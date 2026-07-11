import { z } from 'zod';

const createFaqValidationSchema = z.object({
  body: z.object({
    question: z.string().min(1, { message: 'Question is required' }),
    answer: z.string().min(1, { message: 'Answer is required' }),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateFaqValidationSchema = z.object({
  body: z.object({
    question: z.string().min(1).optional(),
    answer: z.string().min(1).optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const reorderFaqValidationSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.string(),
          order: z.number(),
        }),
      )
      .min(1),
  }),
});

export const FaqValidation = {
  createFaqValidationSchema,
  updateFaqValidationSchema,
  reorderFaqValidationSchema,
};
