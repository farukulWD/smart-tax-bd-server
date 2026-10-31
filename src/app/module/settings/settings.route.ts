import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { SettingsController } from './settings.controller';
import { SettingsValidation } from './settings.validation';

const router = Router();

// Public — clients show the current service fee before an order is created
router.get('/', SettingsController.getSettings);

// Admin — update the service fee for new orders
router.patch(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(SettingsValidation.updateSettingsValidationSchema),
  SettingsController.updateSettings,
);

export const SettingsRoutes = router;
