import { Document, Types } from 'mongoose';

export const DISCOUNT_TYPES = ['percentage', 'fixed'] as const;
export type TDiscountType = (typeof DISCOUNT_TYPES)[number];

export interface ICoupon extends Document {
  /** Always stored uppercase so lookups are case-insensitive without a regex. */
  code: string;
  /** Admin-facing note; never shown to the customer. */
  description?: string;
  discountType: TDiscountType;
  /** Percent (0-100) when `discountType` is 'percentage', BDT otherwise. */
  discountValue: number;
  validFrom?: Date;
  /** Absent means the coupon never expires. */
  validUntil?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Frozen copy of the coupon written onto a tax order when it is applied.
 *
 * Deliberately a snapshot rather than a live `ref`: editing or deleting a
 * coupon must never retroactively reprice an order that was already placed
 * under it. `discount_amount` is the only field the money math reads.
 */
export interface IAppliedCoupon {
  couponId?: Types.ObjectId;
  code: string;
  discountType: TDiscountType;
  discountValue: number;
  discount_amount: number;
  applied_at?: Date;
}

/**
 * Usage figures derived from the `applied_coupon` snapshots on tax orders.
 *
 * Derived rather than stored: a denormalised counter on the coupon would drift
 * the moment an order is deleted or its coupon removed, and the snapshots are
 * already the authoritative record of who used what.
 */
export interface ICouponUsage {
  /** Orders where the service fee has actually been settled. */
  usageCount: number;
  /** Orders carrying the coupon whose fee is not settled yet. */
  pendingCount: number;
  /** BDT given up across settled orders. */
  totalDiscount: number;
}
