import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { ICoupon, ICouponUsage } from './coupon.interface';
import { Coupon } from './coupon.model';
import { isInvalidPercentage } from './coupon.utils';

const EMPTY_USAGE: ICouponUsage = {
  usageCount: 0,
  pendingCount: 0,
  totalDiscount: 0,
};

/**
 * Counts how many orders used each of the given coupons.
 *
 * One aggregation for the whole page rather than a count per row. "Settled"
 * (a real redemption) is deliberately separated from "pending": a coupon
 * applied to an order that is still awaiting manual bKash payment has not been
 * redeemed yet, and counting it as such would overstate the cost.
 */
const getUsageByCouponIds = async (
  couponIds: Types.ObjectId[],
): Promise<Map<string, ICouponUsage>> => {
  const usage = new Map<string, ICouponUsage>();
  if (!couponIds.length) {
    return usage;
  }

  const isSettled = {
    $or: [
      { $eq: ['$is_fee_amount_paid', true] },
      { $in: ['$status', ['order_placed', 'completed']] },
    ],
  };

  const rows = await Tax.aggregate<{
    _id: Types.ObjectId;
    usageCount: number;
    pendingCount: number;
    totalDiscount: number;
  }>([
    { $match: { 'applied_coupon.couponId': { $in: couponIds } } },
    {
      $group: {
        _id: '$applied_coupon.couponId',
        usageCount: { $sum: { $cond: [isSettled, 1, 0] } },
        pendingCount: { $sum: { $cond: [isSettled, 0, 1] } },
        totalDiscount: {
          $sum: {
            $cond: [
              isSettled,
              { $ifNull: ['$applied_coupon.discount_amount', 0] },
              0,
            ],
          },
        },
      },
    },
  ]);

  rows.forEach(row => {
    usage.set(String(row._id), {
      usageCount: row.usageCount,
      pendingCount: row.pendingCount,
      totalDiscount: row.totalDiscount,
    });
  });

  return usage;
};

const getAllCouponsAdminFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (query.status === 'active') {
    filter.isActive = true;
  }

  if (query.status === 'inactive') {
    filter.isActive = false;
  }

  if (query.discountType) {
    filter.discountType = query.discountType;
  }

  if (query.search) {
    const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const search = new RegExp(escaped, 'i');
    filter.$or = [{ code: search }, { description: search }];
  }

  const [rows, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  const usage = await getUsageByCouponIds(rows.map(row => row._id));
  const data = rows.map(row => ({
    ...row,
    ...(usage.get(String(row._id)) ?? EMPTY_USAGE),
  }));

  return {
    data,
    meta: { limit, page, total, totalPage: Math.ceil(total / limit) },
  };
};

const getSingleCouponFromDB = async (id: string) => {
  const result = await Coupon.findById(id).lean();
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  const usage = await getUsageByCouponIds([result._id]);
  return { ...result, ...(usage.get(String(result._id)) ?? EMPTY_USAGE) };
};

const createCouponToDB = async (payload: Partial<ICoupon>) => {
  const code = String(payload.code || '')
    .trim()
    .toUpperCase();

  const duplicate = await Coupon.findOne({ code });
  if (duplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A coupon "${code}" already exists`,
    );
  }

  const result = await Coupon.create({ ...payload, code });
  return result;
};

const updateCouponInDB = async (id: string, payload: Partial<ICoupon>) => {
  const isExist = await Coupon.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  const update: Partial<ICoupon> = { ...payload };

  if (payload.code !== undefined) {
    const code = String(payload.code).trim().toUpperCase();
    const duplicate = await Coupon.findOne({ code, _id: { $ne: id } });
    if (duplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        `A coupon "${code}" already exists`,
      );
    }
    update.code = code;
  }

  // A partial edit can change just one half of the pair, so re-check the
  // merged result: switching a 500-BDT coupon to 'percentage' must not slip
  // through as a 500% discount.
  const discountType = payload.discountType ?? isExist.discountType;
  const discountValue = payload.discountValue ?? isExist.discountValue;
  if (isInvalidPercentage(discountType, discountValue)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'A percentage discount must be between 1 and 100',
    );
  }

  // `null` clears a bound and `undefined` leaves it alone, so `??` alone would
  // compare a cleared bound against its stored value.
  const validFrom =
    payload.validFrom !== undefined ? payload.validFrom : isExist.validFrom;
  const validUntil =
    payload.validUntil !== undefined ? payload.validUntil : isExist.validUntil;
  if (validFrom && validUntil && validUntil.getTime() <= validFrom.getTime()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Valid until must be after valid from',
    );
  }

  const result = await Coupon.findByIdAndUpdate(id, update, { new: true });
  return result;
};

const deleteCouponFromDB = async (id: string) => {
  const isExist = await Coupon.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  // Orders keep a frozen `applied_coupon` snapshot, so deleting a coupon never
  // reprices an order that already used it.
  const result = await Coupon.findByIdAndDelete(id);
  return result;
};

/**
 * Shared redemption gate: resolves a customer-supplied code to a usable coupon
 * or throws the reason it cannot be used. Every path that applies a discount
 * must go through here.
 */
const validateCouponByCode = async (code: string) => {
  const normalized = String(code || '')
    .trim()
    .toUpperCase();

  if (!normalized) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon code is required');
  }

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invalid coupon code');
  }

  if (!coupon.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This coupon is no longer active',
    );
  }

  const now = Date.now();

  if (coupon.validFrom && now < coupon.validFrom.getTime()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This coupon is not active yet');
  }

  if (coupon.validUntil && now > coupon.validUntil.getTime()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This coupon has expired');
  }

  return coupon;
};

export const CouponService = {
  getAllCouponsAdminFromDB,
  getSingleCouponFromDB,
  createCouponToDB,
  updateCouponInDB,
  deleteCouponFromDB,
  validateCouponByCode,
};
