import { z } from 'zod';

const labelSchema = z.object({
  en: z.string().min(1, { message: 'English label is required' }),
  bn: z.string().min(1, { message: 'Bangla label is required' }),
});

const createFileNameValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    label: labelSchema,
    isCommon: z.boolean().optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateFileNameValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    label: labelSchema.optional(),
    isCommon: z.boolean().optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const reorderFileNameValidationSchema = z.object({
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

export const FileNameValidation = {
  createFileNameValidationSchema,
  updateFileNameValidationSchema,
  reorderFileNameValidationSchema,
};
