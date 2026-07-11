import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { HowItWorkService } from './howItWork.service';

const getPublicHowItWorks = catchAsync(async (req, res) => {
  const result = await HowItWorkService.getPublicHowItWorksFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work steps fetched successfully',
    data: result,
  });
});

const getAllHowItWorksAdmin = catchAsync(async (req, res) => {
  const result = await HowItWorkService.getAllHowItWorksAdminFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work steps fetched successfully',
    data: result,
  });
});

const createHowItWork = catchAsync(async (req, res) => {
  const result = await HowItWorkService.createHowItWorkToDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'How It Work step created successfully',
    data: result,
  });
});

const updateHowItWork = catchAsync(async (req, res) => {
  const result = await HowItWorkService.updateHowItWorkInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work step updated successfully',
    data: result,
  });
});

const reorderHowItWorks = catchAsync(async (req, res) => {
  const result = await HowItWorkService.reorderHowItWorksInDB(
    req.body.items,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work steps reordered successfully',
    data: result,
  });
});

const deleteHowItWork = catchAsync(async (req, res) => {
  const result = await HowItWorkService.deleteHowItWorkFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work step deleted successfully',
    data: result,
  });
});

const getHowItWorkSection = catchAsync(async (req, res) => {
  const result = await HowItWorkService.getHowItWorkSectionFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work section fetched successfully',
    data: result,
  });
});

const updateHowItWorkSection = catchAsync(async (req, res) => {
  const result = await HowItWorkService.upsertHowItWorkSectionInDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'How It Work section updated successfully',
    data: result,
  });
});

export const HowItWorkController = {
  getPublicHowItWorks,
  getAllHowItWorksAdmin,
  createHowItWork,
  updateHowItWork,
  reorderHowItWorks,
  deleteHowItWork,
  getHowItWorkSection,
  updateHowItWorkSection,
};
