import { model, Schema } from 'mongoose';
import { INotification } from './notification.interface';
import { NOTIFICATION_TYPE } from './notification.constant';

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    isGlobal: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ isGlobal: 1, isRead: 1 });

export const Notification = model<INotification>(
  'Notification',
  notificationSchema,
);
