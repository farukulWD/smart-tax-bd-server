import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FileNameService } from './fileName.service';

const getPublicFileNames = catchAsync(async (req, res) => {
  const result = await FileNameService.getPublicFileNamesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File names fetched successfully',
    data: result,
  });
});

const getAllFileNamesAdmin = catchAsync(async (req, res) => {
  const result = await FileNameService.getAllFileNamesAdminFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File names fetched successfully',
    data: result,
  });
});

const createFileName = catchAsync(async (req, res) => {
  const result = await FileNameService.createFileNameToDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'File name created successfully',
    data: result,
  });
});

const updateFileName = catchAsync(async (req, res) => {
  const result = await FileNameService.updateFileNameInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File name updated successfully',
    data: result,
  });
});

const reorderFileNames = catchAsync(async (req, res) => {
  const result = await FileNameService.reorderFileNamesInDB(req.body.items);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File names reordered successfully',
    data: result,
  });
});

const deleteFileName = catchAsync(async (req, res) => {
  const result = await FileNameService.deleteFileNameFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'File name deleted successfully',
    data: result,
  });
});

export const FileNameController = {
  getPublicFileNames,
  getAllFileNamesAdmin,
  createFileName,
  updateFileName,
  reorderFileNames,
  deleteFileName,
};
