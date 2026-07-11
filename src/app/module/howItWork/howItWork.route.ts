import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { HowItWorkController } from './howItWork.controller';
import { HowItWorkValidation } from './howItWork.validation';

const router = Router();

// Public — active steps for the homepage
router.get('/', HowItWorkController.getPublicHowItWorks);

// Public — section heading
router.get('/section', HowItWorkController.getHowItWorkSection);

// Admin — update section heading
router.patch(
  '/section/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(HowItWorkValidation.updateHowItWorkSectionValidationSchema),
  HowItWorkController.updateHowItWorkSection,
);

// Admin — all steps (active and inactive)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  HowItWorkController.getAllHowItWorksAdmin,
);

// Admin — create step
router.post(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(HowItWorkValidation.createHowItWorkValidationSchema),
  HowItWorkController.createHowItWork,
);

// Admin — bulk reorder (must be registered before the /admin/:id route)
router.patch(
  '/admin/reorder',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(HowItWorkValidation.reorderHowItWorkValidationSchema),
  HowItWorkController.reorderHowItWorks,
);

// Admin — update step (content and/or isActive/order)
router.patch(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(HowItWorkValidation.updateHowItWorkValidationSchema),
  HowItWorkController.updateHowItWork,
);

// Admin — delete step
router.delete(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  HowItWorkController.deleteHowItWork,
);

export const HowItWorkRoutes = router;
