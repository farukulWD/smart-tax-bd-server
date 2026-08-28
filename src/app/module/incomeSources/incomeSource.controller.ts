import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { IncomeSourceService } from './incomeSource.service';

const getPublicIncomeSources = catchAsync(async (req, res) => {
  const result = await IncomeSourceService.getPublicIncomeSourcesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Income sources fetched successfully',
    data: result,
  });
});

const getAllIncomeSourcesAdmin = catchAsync(async (req, res) => {
  const result = await IncomeSourceService.getAllIncomeSourcesAdminFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Income sources fetched successfully',
    data: result,
  });
});

const createIncomeSource = catchAsync(async (req, res) => {
  const result = await IncomeSourceService.createIncomeSourceToDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Income source created successfully',
    data: result,
  });
});

const updateIncomeSource = catchAsync(async (req, res) => {
  const result = await IncomeSourceService.updateIncomeSourceInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Income source updated successfully',
    data: result,
  });
});

const reorderIncomeSources = catchAsync(async (req, res) => {
  const result = await IncomeSourceService.reorderIncomeSourcesInDB(
    req.body.items,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Income sources reordered successfully',
    data: result,
  });
});

const deleteIncomeSource = catchAsync(async (req, res) => {
  const result = await IncomeSourceService.deleteIncomeSourceFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Income source deleted successfully',
    data: result,
  });
});

export const IncomeSourceController = {
  getPublicIncomeSources,
  getAllIncomeSourcesAdmin,
  createIncomeSource,
  updateIncomeSource,
  reorderIncomeSources,
  deleteIncomeSource,
};
