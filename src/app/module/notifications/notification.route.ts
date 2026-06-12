import { Router } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import { notificationController } from './notification.controller';

const router = Router();

router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  notificationController.getMyNotifications,
);

router.get(
  '/unread-count',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  notificationController.getUnreadCount,
);

router.patch(
  '/read-all',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  notificationController.markAllAsRead,
);

router.patch(
  '/:id/read',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  notificationController.markAsRead,
);

router.delete(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  notificationController.deleteNotification,
);

router.get(
  '/all',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  notificationController.getAllNotifications,
);

export const notificationRoutes = router;
