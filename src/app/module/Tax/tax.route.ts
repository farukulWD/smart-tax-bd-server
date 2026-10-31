import { Router, NextFunction, Request, Response } from 'express';
import { TaxController } from './tax.controller';
import auth from '../../middlewares/auth';
import { paymentCallbackLimiter } from '../../middlewares/rateLimiter';
import { USER_ROLE } from '../users/user.constant';
import { upload } from '../../utils/sendImageToCloudinary';

const router = Router();

router.post(
  '/step-1',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.createTaxStepOne,
);

router.patch(
  '/:taxId/step-1',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.updateTaxStepOne,
);

router.patch(
  '/:taxId/step-2',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.uploadTaxStepTwoDocuments,
);

router.post(
  '/:taxId/step-3',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.payTaxStepThree,
);

// Coupon applied to the service fee. Persisted on the order so the gateway
// payment charges the discounted amount — the client is never trusted to send
// a discount value.
router.post(
  '/:taxId/apply-coupon',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.applyCoupon,
);

router.delete(
  '/:taxId/coupon',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.removeCoupon,
);

router.patch(
  '/update-tax-order/:taxId',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.updateTaxOrder,
);

router.post(
  '/payment/success',
  paymentCallbackLimiter,
  TaxController.taxPaymentSuccess,
);
router.post(
  '/payment/fail',
  paymentCallbackLimiter,
  TaxController.taxPaymentFail,
);
router.post(
  '/payment/cancel',
  paymentCallbackLimiter,
  TaxController.taxPaymentCancel,
);

router.get('/my-orders', auth(USER_ROLE.user), TaxController.getMyTaxOrders);

router.get(
  '/all-orders',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getAllTaxOrders,
);

router.post(
  '/:taxId/admin-upload-document',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = { ...JSON.parse(req.body.data), ...req.body };
    }
    next();
  },
  TaxController.adminUploadDocumentForUser,
);

router.get(
  '/:taxId',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getSingleTaxOrder,
);

export const TaxRoutes = router;
