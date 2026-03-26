import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UpdateNewsService } from './updateNews.service';

const createNews = catchAsync(async (req, res) => {
  const result = await UpdateNewsService.createNewsToDB(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'News created successfully',
    data: result,
  });
});

const getAllNews = catchAsync(async (req, res) => {
  const result = await UpdateNewsService.getAllNewsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'News fetched successfully',
    data: result,
  });
});

const getAllNewsAdmin = catchAsync(async (req, res) => {
  const result = await UpdateNewsService.getAllNewsAdminFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'News fetched successfully',
    data: result,
  });
});

const getSingleNews = catchAsync(async (req, res) => {
  const result = await UpdateNewsService.getSingleNewsFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'News fetched successfully',
    data: result,
  });
});

const updateNews = catchAsync(async (req, res) => {
  const result = await UpdateNewsService.updateNewsInDB(
    req.params.id as string,
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'News updated successfully',
    data: result,
  });
});

const deleteNews = catchAsync(async (req, res) => {
  const result = await UpdateNewsService.deleteNewsFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'News deleted successfully',
    data: result,
  });
});

export const UpdateNewsController = {
  createNews,
  getAllNews,
  getAllNewsAdmin,
  getSingleNews,
  updateNews,
  deleteNews,
};
