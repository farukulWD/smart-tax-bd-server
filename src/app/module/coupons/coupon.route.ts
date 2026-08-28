import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { CouponController } from './coupon.controller';
import { CouponValidation } from './coupon.validation';

const router = Router();

// Admin — paginated list (page, limit, search, status, discountType)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  CouponController.getAllCouponsAdmin,
);

// Admin — create coupon
router.post(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(CouponValidation.createCouponValidationSchema),
  CouponController.createCoupon,
);

// Admin — single coupon (the edit page loads by id; the list is paginated)
router.get(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  CouponController.getSingleCoupon,
);

// Admin — update coupon (content and/or isActive)
router.patch(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(CouponValidation.updateCouponValidationSchema),
  CouponController.updateCoupon,
);

// Admin — delete coupon
router.delete(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  CouponController.deleteCoupon,
);

export const CouponRoutes = router;
