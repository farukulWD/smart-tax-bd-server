import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { IUpdateNews } from './updateNews.interface';
import { UpdateNews } from './updateNews.model';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';

const createNewsToDB = async (
  payload: Partial<IUpdateNews>,
  file?: Express.Multer.File,
) => {
  if (file) {
    const uploadResult = await sendImageToCloudinary(
      `update-news-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    payload.attachment = uploadResult.secure_url as string;
  }

  const result = await UpdateNews.create(payload);
  return result;
};

const getAllNewsFromDB = async () => {
  const result = await UpdateNews.find({ isActive: true }).sort({
    createdAt: -1,
  });
  return result;
};

const getAllNewsAdminFromDB = async () => {
  const result = await UpdateNews.find({}).sort({ createdAt: -1 });
  return result;
};

const getSingleNewsFromDB = async (id: string) => {
  const result = await UpdateNews.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'News not found');
  }
  return result;
};

const updateNewsInDB = async (
  id: string,
  payload: Partial<IUpdateNews>,
  file?: Express.Multer.File,
) => {
  const isExist = await UpdateNews.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'News not found');
  }

  if (file) {
    const uploadResult = await sendImageToCloudinary(
      `update-news-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    payload.attachment = uploadResult.secure_url as string;
  }

  const result = await UpdateNews.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteNewsFromDB = async (id: string) => {
  const isExist = await UpdateNews.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'News not found');
  }
  const result = await UpdateNews.findByIdAndDelete(id);
  return result;
};

export const UpdateNewsService = {
  createNewsToDB,
  getAllNewsFromDB,
  getAllNewsAdminFromDB,
  getSingleNewsFromDB,
  updateNewsInDB,
  deleteNewsFromDB,
};
