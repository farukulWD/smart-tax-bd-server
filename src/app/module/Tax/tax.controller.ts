import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import { TaxService } from './tax.services';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const createTaxStepOne = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const result = await TaxService.createTaxStepOneToDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Tax step-1 completed successfully',
    data: result,
  });
});

const updateTaxStepOne = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.updateTaxStepOneToDB(userId, taxId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax step-1 updated successfully',
    data: result,
  });
});

const uploadTaxStepTwoDocuments = catchAsync(
  async (req: Request, res: Response) => {
    const userId = String(req.user?.userId || '');
    const taxId = String(req.params.taxId || '');
    const { documents } = req.body;

    const result = await TaxService.uploadTaxStepTwoDocumentsToDB(
      userId,
      taxId,
      documents,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Tax step-2 documents uploaded successfully',
      data: result,
    });
  },
);

const payTaxStepThree = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.initTaxStepThreePaymentToDB(userId, taxId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax step-3 payment initialized successfully',
    data: result,
  });
});

const taxPaymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(
    req.body?.tran_id || req.query?.tran_id || req.params?.transactionId || '',
  );
  const result =
    await TaxService.completeTaxOrderPaymentSuccessToDB(transactionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment success processed and order placed',
    data: result,
  });
});

const taxPaymentFail = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(req.body?.tran_id || req.query?.tran_id || '');
  await TaxService.markTaxOrderPaymentFailedToDB(transactionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: false,
    message: 'Payment failed',
    data: null,
  });
});

const taxPaymentCancel = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(req.body?.tran_id || req.query?.tran_id || '');
  await TaxService.markTaxOrderPaymentFailedToDB(transactionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: false,
    message: 'Payment cancelled',
    data: null,
  });
});

const taxPaymentIpn = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(req.body?.tran_id || req.query?.tran_id || '');
  if (transactionId) {
    await TaxService.completeTaxOrderPaymentSuccessToDB(transactionId);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'IPN received',
    data: null,
  });
});

const getSingleTaxOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.getTaxOrderByIdFromDB(userId, taxId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax order fetched successfully',
    data: result,
  });
});

const getMyTaxOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  console.log({ userId });
  const result = await TaxService.getMyTaxOrdersFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My tax orders fetched successfully',
    data: result,
  });
});

const getAllTaxOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxService.getAllTaxOrdersFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All tax orders fetched successfully',
    data: result,
  });
});

export const TaxController = {
  createTaxStepOne,
  updateTaxStepOne,
  uploadTaxStepTwoDocuments,
  payTaxStepThree,
  taxPaymentSuccess,
  taxPaymentFail,
  taxPaymentCancel,
  taxPaymentIpn,
  getSingleTaxOrder,
  getMyTaxOrders,
  getAllTaxOrders,
};
