import { z } from 'zod';

const taxTypeValueEnum = z.enum([
  'income_tax',
  'income_tax_government',
  'income_tax_non_government',
  'house_rental_tax',
  'property_tax',
  'business_tax',
  'import_duty',
  'vat',
  'excise_duty',
  'customs_duty',
  'capital_gains_tax',
  'gift_tax',
  'inheritance_tax',
  'sales_tax',
  'service_tax',
  'entertainment_tax',
  'environmental_tax',
  'wealth_tax',
]);

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
