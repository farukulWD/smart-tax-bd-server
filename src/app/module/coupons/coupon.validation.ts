import { z } from 'zod';
import { DISCOUNT_TYPES } from './coupon.interface';

const discountTypeEnum = z.enum(DISCOUNT_TYPES);

// `.nullable()` short-circuits the coercion, which matters: the admin form
// sends `null` for an unset bound, and a bare `z.coerce.date()` would turn that
// into 1970-01-01 (silently creating an already-expired coupon).
const optionalDate = z.coerce.date().nullable().optional();

const createCouponValidationSchema = z.object({
  body: z
    .object({
      code: z
        .string()
        .trim()
        .min(3, { message: 'Coupon code must be at least 3 characters' })
        .max(32, { message: 'Coupon code must be at most 32 characters' })
        .regex(/^[A-Za-z0-9_-]+$/, {
          message: 'Coupon code may only contain letters, numbers, - and _',
        }),
      description: z.string().trim().optional(),
      discountType: discountTypeEnum,
      discountValue: z
        .number()
        .positive({ message: 'Discount value must be greater than 0' }),
      validFrom: optionalDate,
      validUntil: optionalDate,
      isActive: z.boolean().optional(),
    })
    .refine(
      data => data.discountType !== 'percentage' || data.discountValue <= 100,
      {
        message: 'A percentage discount cannot exceed 100',
        path: ['discountValue'],
      },
    )
    .refine(
      data =>
        !data.validFrom ||
        !data.validUntil ||
        data.validUntil.getTime() > data.validFrom.getTime(),
      {
        message: 'Valid until must be after valid from',
        path: ['validUntil'],
      },
    ),
});

const updateCouponValidationSchema = z.object({
  body: z
    .object({
      code: z
        .string()
        .trim()
        .min(3)
        .max(32)
        .regex(/^[A-Za-z0-9_-]+$/, {
          message: 'Coupon code may only contain letters, numbers, - and _',
        })
        .optional(),
      description: z.string().trim().optional(),
      discountType: discountTypeEnum.optional(),
      discountValue: z.number().positive().optional(),
      validFrom: optionalDate,
      validUntil: optionalDate,
      isActive: z.boolean().optional(),
    })
    // Only catches the case where both fields are sent together; a partial edit
    // that changes just one of them is re-checked against the stored row in
    // `updateCouponInDB`.
    .refine(
      data =>
        data.discountType !== 'percentage' ||
        data.discountValue === undefined ||
        data.discountValue <= 100,
      {
        message: 'A percentage discount cannot exceed 100',
        path: ['discountValue'],
      },
    ),
});

export const CouponValidation = {
  createCouponValidationSchema,
  updateCouponValidationSchema,
};
