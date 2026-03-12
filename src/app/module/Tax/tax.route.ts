import { Router } from 'express';
import { TaxController } from './tax.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';

const router = Router();

router.post(
  '/order-tax/step-1',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.createTaxStepOne,
);

router.patch(
  '/order-tax/:taxId/step-1',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.updateTaxStepOne,
);

router.patch(
  '/order-tax/:taxId/step-2',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.uploadTaxStepTwoDocuments,
);

router.post(
  '/order-tax/:taxId/step-3',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.payTaxStepThree,
);

router.post('/order-tax/payment/success', TaxController.taxPaymentSuccess);
router.post('/order-tax/payment/fail', TaxController.taxPaymentFail);
router.post('/order-tax/payment/cancel', TaxController.taxPaymentCancel);
router.post('/order-tax/payment/ipn', TaxController.taxPaymentIpn);

router.get(
  '/order-tax/:taxId',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getSingleTaxOrder,
);

export const TaxRoutes = router;
