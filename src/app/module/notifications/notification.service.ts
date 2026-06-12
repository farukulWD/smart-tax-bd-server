import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { emitNotification } from '../../utils/socket';
import { INotification, ISendNotificationParams } from './notification.interface';
import { Notification } from './notification.model';

const sendNotification = async (
  params: ISendNotificationParams,
): Promise<INotification> => {
  const isGlobal = params.recipientId === null;

  const notification = await Notification.create({
    recipientId: params.recipientId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data ?? {},
    isRead: false,
    isGlobal,
  });

  emitNotification(params.recipientId, params.type, notification.toObject());

  return notification;
};

const getMyNotifications = async (
  userId: string,
  query: { isRead?: string; page?: string; limit?: string },
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    $or: [{ recipientId: userId }, { isGlobal: true }],
  };

  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === 'true';
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  const isOwner =
    notification.isGlobal ||
    notification.recipientId?.toString() === userId;

  if (!isOwner) {
    throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

const markAllAsRead = async (userId: string) => {
  await Notification.updateMany(
    {
      $or: [{ recipientId: userId }, { isGlobal: true }],
      isRead: false,
    },
    { isRead: true },
  );

  return null;
};

const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  const isOwner =
    notification.isGlobal ||
    notification.recipientId?.toString() === userId;

  if (!isOwner) {
    throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
  }

  await Notification.findByIdAndDelete(notificationId);

  return null;
};

const getAllNotifications = async (query: {
  page?: string;
  limit?: string;
  type?: string;
}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipientId', 'name email mobile'),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getUnreadCount = async (userId: string) => {
  const count = await Notification.countDocuments({
    $or: [{ recipientId: userId }, { isGlobal: true }],
    isRead: false,
  });

  return { count };
};

export const notificationService = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getAllNotifications,
  getUnreadCount,
};
