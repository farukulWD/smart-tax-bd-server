import { z } from 'zod';

const titleSchema = z.object({
  en: z.string().min(1, { message: 'English title is required' }),
  bn: z.string().min(1, { message: 'Bangla title is required' }),
});

const createIncomeSourceValidationSchema = z.object({
  body: z.object({
    value: z.string().min(1, { message: 'Value is required' }),
    title: titleSchema,
    required_files: z.array(z.string()).optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateIncomeSourceValidationSchema = z.object({
  body: z.object({
    value: z.string().min(1).optional(),
    title: titleSchema.optional(),
    required_files: z.array(z.string()).optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const reorderIncomeSourceValidationSchema = z.object({
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

export const IncomeSourceValidation = {
  createIncomeSourceValidationSchema,
  updateIncomeSourceValidationSchema,
  reorderIncomeSourceValidationSchema,
};
