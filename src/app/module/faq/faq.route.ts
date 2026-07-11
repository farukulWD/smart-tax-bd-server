import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { FaqController } from './faq.controller';
import { FaqValidation } from './faq.validation';

const router = Router();

// Public — active FAQs for the homepage
router.get('/', FaqController.getPublicFaqs);

// Admin — all FAQs (active and inactive)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  FaqController.getAllFaqsAdmin,
);

// Admin — create FAQ
router.post(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FaqValidation.createFaqValidationSchema),
  FaqController.createFaq,
);

// Admin — bulk reorder (must be registered before the /admin/:id route)
router.patch(
  '/admin/reorder',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FaqValidation.reorderFaqValidationSchema),
  FaqController.reorderFaqs,
);

// Admin — update FAQ (content and/or isActive/order)
router.patch(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FaqValidation.updateFaqValidationSchema),
  FaqController.updateFaq,
);

// Admin — delete FAQ
router.delete(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  FaqController.deleteFaq,
);

export const FaqRoutes = router;
