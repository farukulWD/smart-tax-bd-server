import { USER_ROLE } from './../users/user.constant';
import { Router } from 'express';
import { paymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentValidation } from './payment.validation';

const router = Router();

router.post('/initialize', auth(USER_ROLE.user), paymentController.initPayment);
router.post(
  '/record-cash',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(PaymentValidation.recordCashPayment),
  paymentController.recordCashPayment,
);
// router.post('/ipn', paymentController.ipn);
router.post('/success', paymentController.success);
router.post('/fail', paymentController.fail);
router.post('/cancel', paymentController.cancel);
router.get(
  '/all',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  paymentController.getAllPayment,
);
router.get(
  '/user-payment',
  auth(USER_ROLE.user),
  paymentController.getUserPayment,
);
router.get(
  '/payments-by-order-id/:orderId',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  paymentController.getAPaymentByOrderId,
);

export const paymentRoutes = router;
