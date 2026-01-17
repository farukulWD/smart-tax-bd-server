import AppError from '../../errors/AppError';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import httpStatus from 'http-status';
import { Ifile } from './files.interface';
import { Files } from './files.model';
import { User } from '../users/user.model';

const createFileToDB = async (file: Express.Multer.File, payload: Ifile) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File not found');
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }
  const fileName = file.originalname
    .replace(/\.[^/.]+$/, '')
    .replace(/\s+/g, '_');

  const { secure_url } = await sendImageToCloudinary(
    fileName,
    file.path,
    file.mimetype
  );

  const fileData = await Files.create({ ...payload, file: secure_url });

  return fileData;
};

const deleteFileFromDB = async (id: string) => {
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File not found');
  }

  const fileData = await Files.findByIdAndDelete(id);

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

  const fileData = await Files.findById(id);

  return fileData;
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
