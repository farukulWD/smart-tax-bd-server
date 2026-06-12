import { Schema, Types } from 'mongoose';
import { TNotificationType } from './notification.constant';

export interface INotification {
  recipientId: Schema.Types.ObjectId | null;
  type: TNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;       // admin read state
  readBy: Types.ObjectId[]; // per-user read tracking
  isGlobal: boolean;
}

export interface ISendNotificationParams {
  recipientId: string | null;
  type: TNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
