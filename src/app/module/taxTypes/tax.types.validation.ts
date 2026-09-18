import { z } from 'zod';

const taxTypeValueSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]+$/, {
    message: 'Value may only use lowercase letters, numbers and _',
  });

const localizedTextSchema = z.object({
  en: z.string().min(1, { message: 'English text is required' }),
  bn: z.string().min(1, { message: 'Bangla text is required' }),
});

const createTaxTypeValidationSchema = z.object({
  body: z.object({
    title: localizedTextSchema,
    description: localizedTextSchema,
    rate: z.number({
      required_error: 'Rate is required',
      invalid_type_error: 'Rate must be a number',
    }),
    value: taxTypeValueSchema,
    icon: z.string().optional(),
    required_files: z.array(z.string()).optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateTaxTypeValidationSchema = z.object({
  body: z.object({
    title: localizedTextSchema.optional(),
    description: localizedTextSchema.optional(),
    rate: z.number().optional(),
    value: taxTypeValueSchema.optional(),
    icon: z.string().optional(),
    required_files: z.array(z.string()).optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const reorderTaxTypeValidationSchema = z.object({
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

export const TaxTypeValidation = {
  createTaxTypeValidationSchema,
  updateTaxTypeValidationSchema,
  reorderTaxTypeValidationSchema,
};
