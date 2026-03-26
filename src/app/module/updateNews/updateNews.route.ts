import { NextFunction, Request, Response, Router } from 'express';
import { UpdateNewsController } from './updateNews.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import { upload } from '../../utils/sendImageToCloudinary';

const router = Router();

// Public — active news for marquee
router.get('/get-all-news', UpdateNewsController.getAllNews);

// Public — single news detail
router.get('/get-news/:id', UpdateNewsController.getSingleNews);

// Admin — all news (including inactive)
router.get(
  '/admin/get-all-news',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  UpdateNewsController.getAllNewsAdmin,
);

// Admin — create news (optional attachment upload)
router.post(
  '/create-news',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('attachment'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    next();
  },
  UpdateNewsController.createNews,
);

// Admin — update news
router.patch(
  '/update-news/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('attachment'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    next();
  },
  UpdateNewsController.updateNews,
);

// Admin — delete news
router.delete(
  '/delete-news/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  UpdateNewsController.deleteNews,
);

export const UpdateNewsRoute = router;
