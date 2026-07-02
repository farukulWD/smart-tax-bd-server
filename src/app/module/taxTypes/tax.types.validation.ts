import { z } from 'zod';
import { TAX_TYPE_VALUES } from './tax.types.interface';

const taxTypeValueEnum = z.enum(TAX_TYPE_VALUES);

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
    value: taxTypeValueEnum,
    icon: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateTaxTypeValidationSchema = z.object({
  body: z.object({
    title: localizedTextSchema.optional(),
    description: localizedTextSchema.optional(),
    rate: z.number().optional(),
    value: taxTypeValueEnum.optional(),
    icon: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const TaxTypeValidation = {
  createTaxTypeValidationSchema,
  updateTaxTypeValidationSchema,
};
