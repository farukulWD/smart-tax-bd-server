import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DashboardService } from './dashboard.service';

const getStats = catchAsync(async (req, res) => {
  const result = await DashboardService.getStatsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard stats fetched successfully',
    data: result,
  });
});

const getCharts = catchAsync(async (req, res) => {
  // `validateRequest` only parses body and cookies, so `range` is normalized in
  // the service rather than validated by middleware.
  const result = await DashboardService.getChartsFromDB(req.query.range);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard charts fetched successfully',
    data: result,
  });
});

export const DashboardController = {
  getStats,
  getCharts,
};
