import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { IncomeSourceController } from './incomeSource.controller';
import { IncomeSourceValidation } from './incomeSource.validation';

const router = Router();

// Public — active income sources for the order form on the app
router.get('/', IncomeSourceController.getPublicIncomeSources);

// Admin — all income sources (active and inactive)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  IncomeSourceController.getAllIncomeSourcesAdmin,
);

// Admin — create income source
router.post(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(IncomeSourceValidation.createIncomeSourceValidationSchema),
  IncomeSourceController.createIncomeSource,
);

// Admin — bulk reorder (must be registered before the /admin/:id route)
router.patch(
  '/admin/reorder',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(IncomeSourceValidation.reorderIncomeSourceValidationSchema),
  IncomeSourceController.reorderIncomeSources,
);

// Admin — update income source
router.patch(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(IncomeSourceValidation.updateIncomeSourceValidationSchema),
  IncomeSourceController.updateIncomeSource,
);

// Admin — delete income source
router.delete(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  IncomeSourceController.deleteIncomeSource,
);

export const IncomeSourceRoutes = router;
