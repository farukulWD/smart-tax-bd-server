import { NextFunction, Request, Response, Router } from 'express';
import { FileController } from './file.controller';
import { upload } from '../../utils/sendImageToCloudinary';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';

const router = Router();

router.post(
  '/create-file',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  FileController.createFile
);
router.delete(
  '/delete-file/:id',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  FileController.deleteFile
);
router.get(
  '/get-all-files',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  FileController.getAllFiles
);
router.get(
  '/get-single-file/:id',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  FileController.getSingleFile
);
router.get(
  '/get-user-files',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  FileController.getUserFiles
);

export const FileRoute = router;
