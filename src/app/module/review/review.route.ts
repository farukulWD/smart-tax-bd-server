import { NextFunction, Request, Response, Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { upload } from '../../utils/sendImageToCloudinary';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';

const router = Router();

const parseFormData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.data) {
    req.body = JSON.parse(req.body.data);
  }
  next();
};

// Public — approved reviews for the homepage testimonials section
router.get('/', ReviewController.getPublicReviews);

// User — my own review (create/edit)
router.get(
  '/me',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  ReviewController.getMyReview,
);

router.put(
  '/me',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ReviewValidation.upsertMyReviewValidationSchema),
  ReviewController.upsertMyReview,
);

// Admin — all reviews (any status)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ReviewController.getAllReviewsAdmin,
);

// Admin — create freeform review (auto-approved, optional photo upload)
router.post(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('photo'),
  parseFormData,
  validateRequest(ReviewValidation.createReviewValidationSchema),
  ReviewController.createReviewAdmin,
);

// Admin — update review (content and/or status)
router.patch(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('photo'),
  parseFormData,
  validateRequest(ReviewValidation.updateReviewValidationSchema),
  ReviewController.updateReviewAdmin,
);

// Admin — delete review
router.delete(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ReviewController.deleteReviewAdmin,
);

export const ReviewRoutes = router;
