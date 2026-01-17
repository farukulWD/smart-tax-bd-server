import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { TaxService } from './tax.services';
import sendResponse from '../../utils/sendResponse';

const createTax = catchAsync(async (req: Request, res: Response) => {
  const taxData = req.body;
  // const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // const filesArray = Object.entries(files).map(([fieldName, fileDetails]) => ({
  //   ...fileDetails[0],
  // }));

  const result = await TaxService.createForTaxService({
    ...taxData,
    userId: req.user.userId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax created successfully',
    data: result,
  });
});

const getUserOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxService.getUserOrderService(req.user.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax fetched successfully',
    data: result,
  });
});

const getAllTax = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxService.getTaxService();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax fetched successfully',
    data: result,
  });
});

const getSingleTax = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxService.getSingleTaxService(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax fetched successfully',
    data: result,
  });
});

const updateTax = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxService.updateTaxService(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax updated successfully',
    data: result,
  });
});

const deleteTax = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxService.deleteTaxService(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax deleted successfully',
    data: result,
  });
});

export const TaxController = {
  createTax,
  getAllTax,
  getSingleTax,
  updateTax,
  deleteTax,
  getUserOrder,
};
