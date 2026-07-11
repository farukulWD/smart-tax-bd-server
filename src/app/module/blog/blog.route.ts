import { NextFunction, Request, Response, Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { upload } from '../../utils/sendImageToCloudinary';
import { BlogController } from './blog.controller';
import { BlogValidation } from './blog.validation';

const router = Router();

const parseFormData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.data) {
    req.body = JSON.parse(req.body.data);
  }
  next();
};

// Public — published blogs with pagination/search/category
router.get('/', BlogController.getAllBlogs);

// Public — distinct categories of published blogs
router.get('/categories', BlogController.getCategories);

// Admin — all blogs (any status)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  BlogController.getAllBlogsAdmin,
);

// Admin — single blog by id (edit page, no view increment)
router.get(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  BlogController.getSingleBlogAdmin,
);

// Public — single published blog by slug (increments views, includes related)
router.get('/:slug', BlogController.getSingleBlog);

// Admin — create blog (optional cover image upload)
router.post(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('coverImage'),
  parseFormData,
  validateRequest(BlogValidation.createBlogValidationSchema),
  BlogController.createBlog,
);

// Admin — update blog
router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('coverImage'),
  parseFormData,
  validateRequest(BlogValidation.updateBlogValidationSchema),
  BlogController.updateBlog,
);

// Admin — delete blog
router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  BlogController.deleteBlog,
);

export const BlogRoutes = router;
