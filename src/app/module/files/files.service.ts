import AppError from '../../errors/AppError';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import httpStatus from 'http-status';
import { Ifile } from './files.interface';
import { Files } from './files.model';
import { User } from '../users/user.model';
import { Types } from 'mongoose';
import { notificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE } from '../notifications/notification.constant';

const createFileToDB = async (file: Express.Multer.File, payload: Ifile) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File not found');
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }
  const fileName =
    file.mimetype === 'application/pdf'
      ? file.originalname.replace(/\s+/g, '_')
      : file.originalname.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');

  const { secure_url } = await sendImageToCloudinary(
    fileName,
    file.path,
    file.mimetype,
  );

  const fileData = await Files.create({ ...payload, file: secure_url });

  notificationService
    .sendNotification({
      recipientId: payload.userId.toString(),
      type: NOTIFICATION_TYPE.FILE_UPLOADED,
      title: 'Document Uploaded',
      message: `Your document "${payload.type}" has been uploaded successfully.`,
      data: { fileId: fileData._id, orderId: payload.orderId, type: payload.type },
    })
    .catch(() => {});

  return fileData;
};

const deleteFileFromDB = async (id: string) => {
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File not found');
  }

  const fileData = await Files.findByIdAndDelete(id);

  if (fileData) {
    notificationService
      .sendNotification({
        recipientId: fileData.userId.toString(),
        type: NOTIFICATION_TYPE.FILE_DELETED,
        title: 'Document Deleted',
        message: `Your document "${fileData.type}" has been deleted.`,
        data: { fileId: fileData._id, type: fileData.type },
      })
      .catch(() => {});
  }

  return fileData;
};

const getAllFiles = async () => {
  const fileData = await Files.find();

  return fileData;
};

const getSingleFile = async (id: string) => {
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File not found');
  }

  const fileData = await Files.aggregate([
    {
      $match: { _id: new Types.ObjectId(id) },
    },
    {
      $lookup: {
        from: 'taxes',
        localField: 'orderId',
        foreignField: '_id',
        as: 'order',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $addFields: {
        order: { $arrayElemAt: ['$order', 0] },
        user: { $arrayElemAt: ['$user', 0] },
      },
    },
  ]);

  return fileData[0] || null;
};

const getUserFiles = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  const fileData = await Files.find({ userId });

  return fileData;
};

export const FileServices = {
  createFileToDB,
  deleteFileFromDB,
  getAllFiles,
  getSingleFile,
  getUserFiles,
};
