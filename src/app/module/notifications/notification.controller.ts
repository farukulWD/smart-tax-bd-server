import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
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
  const id = req.params.id as string;
  const result = await notificationService.markAsRead(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  await notificationService.markAllAsRead(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const userId = req.user.userId as string;
  const id = req.params.id as string;
  await notificationService.deleteNotification(id, userId);

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

export const notificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getAllNotifications,
};
