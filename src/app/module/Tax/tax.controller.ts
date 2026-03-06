import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import { TaxService } from './tax.services';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const createTax = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const taxData = req.body;
  taxData.userId = userId;
  const result = await TaxService.createTaxToDB(taxData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Tax created successfully',
    data: result,
  });
});

export const TaxController = {
  createTax,
};
