import { Router } from 'express';
import { TaxController } from './tax.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';

const router = Router();

router.post(
  '/order-tax',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.createTax,
);

router.get(
  '/get-tax',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getAllTax,
);

router.get(
  '/get-tax/:id',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getSingleTax,
);

router.get(
  '/get-tax/:id',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getSingleTax,
);

router.get(
  '/get-tax/:id',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  TaxController.getSingleTax,
);

router.get('/get-user-order', auth(USER_ROLE.user), TaxController.getUserOrder);

export const TaxRoutes = router;
