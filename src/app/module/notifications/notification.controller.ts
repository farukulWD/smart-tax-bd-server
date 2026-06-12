import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { USER_ROLE } from '../users/user.constant';
import { notificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  const result = await notificationService.getMyNotifications(userId, req.query as Record<string, string>);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.notifications,
  });
});

const getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  const result = await notificationService.getUnreadCount(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unread count retrieved successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  const role = req.user.role as string;
  const id = req.params.id as string;

  const isAdmin = role === USER_ROLE.admin || role === USER_ROLE.superAdmin;
  const result = isAdmin
    ? await notificationService.adminMarkAsRead(id)
    : await notificationService.markAsRead(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  const role = req.user.role as string;

  const isAdmin = role === USER_ROLE.admin || role === USER_ROLE.superAdmin;
  if (isAdmin) {
    await notificationService.adminMarkAllAsRead();
  } else {
    await notificationService.markAllAsRead(userId);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  const role = req.user.role as string;
  const id = req.params.id as string;

  const isAdmin = role === USER_ROLE.admin || role === USER_ROLE.superAdmin;
  if (isAdmin) {
    await notificationService.adminDeleteNotification(id);
  } else {
    await notificationService.deleteNotification(id, userId);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification deleted successfully',
    data: null,
  });
});

const getAllNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.getAllNotifications(req.query as Record<string, string>);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications retrieved successfully',
    meta: result.meta,
    data: result.notifications,
  });
});

const getAllUnreadCount = catchAsync(async (_req, res) => {
  const result = await notificationService.getAllUnreadCount();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All unread count retrieved successfully',
    data: result,
  });
});

const adminMarkAsRead = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await notificationService.adminMarkAsRead(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const adminMarkAllAsRead = catchAsync(async (_req, res) => {
  await notificationService.adminMarkAllAsRead();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

export const notificationController = {
  getMyNotifications,
  getUnreadCount,
  getAllUnreadCount,
  markAsRead,
  markAllAsRead,
  adminMarkAsRead,
  adminMarkAllAsRead,
  deleteNotification,
  getAllNotifications,
};
