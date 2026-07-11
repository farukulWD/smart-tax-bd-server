import { z } from 'zod';

const createHowItWorkValidationSchema = z.object({
  body: z.object({
    icon: z.string().min(1, { message: 'Icon is required' }),
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().min(1, { message: 'Description is required' }),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateHowItWorkValidationSchema = z.object({
  body: z.object({
    icon: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const reorderHowItWorkValidationSchema = z.object({
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

const updateHowItWorkSectionValidationSchema = z.object({
  body: z.object({
    badge: z.string().optional(),
    titlePrefix: z.string().min(1, { message: 'Title prefix is required' }),
    titleHighlight: z
      .string()
      .min(1, { message: 'Title highlight is required' }),
    description: z.string().min(1, { message: 'Description is required' }),
  }),
});

export const HowItWorkValidation = {
  createHowItWorkValidationSchema,
  updateHowItWorkValidationSchema,
  reorderHowItWorkValidationSchema,
  updateHowItWorkSectionValidationSchema,
};
