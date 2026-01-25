import { USER_ROLE } from './../users/user.constant';
import { Router } from 'express';
import { paymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/initialize', auth(USER_ROLE.user), paymentController.initPayment);
router.get('/all', auth(USER_ROLE.admin, USER_ROLE.superAdmin), paymentController.getAllPayment);
router.get('/user-payment', auth(USER_ROLE.user), paymentController.getUserPayment);

export const paymentRoutes = router;
