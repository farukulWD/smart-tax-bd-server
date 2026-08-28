import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../users/user.constant';
import { FileNameController } from './fileName.controller';
import { FileNameValidation } from './fileName.validation';

const router = Router();

// Public — active file names (admin picker, client/app document catalog)
router.get('/', FileNameController.getPublicFileNames);

// Admin — all file names (active and inactive)
router.get(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  FileNameController.getAllFileNamesAdmin,
);

// Admin — create file name
router.post(
  '/admin',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FileNameValidation.createFileNameValidationSchema),
  FileNameController.createFileName,
);

// Admin — bulk reorder (must be registered before the /admin/:id route)
router.patch(
  '/admin/reorder',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FileNameValidation.reorderFileNameValidationSchema),
  FileNameController.reorderFileNames,
);

// Admin — update file name
router.patch(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FileNameValidation.updateFileNameValidationSchema),
  FileNameController.updateFileName,
);

// Admin — delete file name
router.delete(
  '/admin/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  FileNameController.deleteFileName,
);

export const FileNameRoutes = router;
