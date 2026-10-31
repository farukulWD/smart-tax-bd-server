import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SettingsService } from './settings.service';

const getSettings = catchAsync(async (req, res) => {
  const result = await SettingsService.getSettingsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Settings fetched successfully',
    data: result,
  });
});

const updateSettings = catchAsync(async (req, res) => {
  const result = await SettingsService.updateSettingsInDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Settings updated successfully',
    data: result,
  });
});

export const SettingsController = {
  getSettings,
  updateSettings,
};
