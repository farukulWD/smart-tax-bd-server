import { ICoupon, TDiscountType } from './coupon.interface';

/**
 * Resolves the BDT a coupon takes off a service fee.
 *
 * The only place discount arithmetic happens — both the apply endpoint and any
 * future recalculation must go through here so a percentage coupon can never
 * produce a different number in two code paths.
 *
 * Clamped to `0 <= discount <= feeAmount`, so the payable fee can never go
 * negative, and floored because BDT is not transacted in fractions (flooring
 * the discount rather than rounding it means the customer never overpays).
 */
export const calculateCouponDiscount = (
  coupon: Pick<ICoupon, 'discountType' | 'discountValue'>,
  feeAmount: number,
): number => {
  const fee = Number(feeAmount) || 0;
  if (fee <= 0) {
    return 0;
  }

  const value = Number(coupon.discountValue) || 0;
  const raw =
    coupon.discountType === 'percentage'
      ? (fee * Math.min(value, 100)) / 100
      : value;

  return Math.max(0, Math.min(Math.floor(raw), fee));
};

/** True when a percentage coupon is being given an out-of-range value. */
export const isInvalidPercentage = (
  discountType: TDiscountType | undefined,
  discountValue: number | undefined,
): boolean =>
  discountType === 'percentage' &&
  discountValue !== undefined &&
  (discountValue <= 0 || discountValue > 100);
