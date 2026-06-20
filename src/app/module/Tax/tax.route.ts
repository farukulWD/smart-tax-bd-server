import { Router, NextFunction, Request, Response } from 'express';
import { TaxController } from './tax.controller';
import auth from '../../middlewares/auth';
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

router.patch(
  '/update-tax-order/:taxId',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.updateTaxOrder,
);

router.post('/payment/success', TaxController.taxPaymentSuccess);
router.post('/payment/fail', TaxController.taxPaymentFail);
router.post('/payment/cancel', TaxController.taxPaymentCancel);
router.post('/payment/ipn', TaxController.taxPaymentIpn);

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
