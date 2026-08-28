import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CouponService } from './coupon.service';

const getAllCouponsAdmin = catchAsync(async (req, res) => {
  const result = await CouponService.getAllCouponsAdminFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupons fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleCoupon = catchAsync(async (req, res) => {
  const result = await CouponService.getSingleCouponFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon fetched successfully',
    data: result,
  });
});

const createCoupon = catchAsync(async (req, res) => {
  const result = await CouponService.createCouponToDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Coupon created successfully',
    data: result,
  });
});

const updateCoupon = catchAsync(async (req, res) => {
  const result = await CouponService.updateCouponInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon updated successfully',
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req, res) => {
  const result = await CouponService.deleteCouponFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon deleted successfully',
    data: result,
  });
});

export const CouponController = {
  getAllCouponsAdmin,
  getSingleCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
