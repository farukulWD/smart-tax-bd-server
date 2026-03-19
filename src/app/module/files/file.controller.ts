import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FileServices } from './files.service';

const createFile = catchAsync(async (req, res) => {
  const { file } = req;
  const payload = req.body;
  const user = req.user;

  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File is required');
  }

  const result = await FileServices.createFileToDB(file, {
    ...payload,
    userId: user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File created successfully',
    data: result,
  });
});

const deleteFile = catchAsync(async (req, res) => {
  const id = req.params.id as string;

  const result = await FileServices.deleteFileFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File deleted successfully',
    data: result,
  });
});

const getAllFiles = catchAsync(async (req, res) => {
  const result = await FileServices.getAllFiles();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Files fetched successfully',
    data: result,
  });
});

const getSingleFile = catchAsync(async (req, res) => {
  const id = req.params.id as string;

  const result = await FileServices.getSingleFile(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File fetched successfully',
    data: result,
  });
});

const getUserFiles = catchAsync(async (req, res) => {
  const { userId } = req.user;

  const result = await FileServices.getUserFiles(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Files fetched successfully',
    data: result,
  });
});

export const FileController = {
  createFile,
  deleteFile,
  getAllFiles,
  getSingleFile,
  getUserFiles,
};
