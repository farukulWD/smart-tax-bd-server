import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { TaxService } from './tax.services';
import sendResponse from '../../utils/sendResponse';

const createTax = catchAsync(async (req: Request, res: Response) => {
  const taxData = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const filesArray = Object.entries(files).map(([fieldName, fileDetails]) => ({
    ...fileDetails[0],
  }));

  const result = await TaxService.createForTaxService(filesArray, taxData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Tax created successfully',
    data: result,
  });
});

export const TaxController = {
  createTax,
};
