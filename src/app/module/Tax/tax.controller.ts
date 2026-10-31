import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import { TaxService } from './tax.services';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { paymentService } from '../payments/payment.service';

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
    const { documents, skip_upload } = req.body;

    const result = await TaxService.uploadTaxStepTwoDocumentsToDB(
      userId,
      taxId,
      documents,
      skip_upload,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: skip_upload
        ? 'Files upload skipped. You can upload documents later.'
        : 'Tax step-2 documents uploaded successfully',
      data: result,
    });
  },
);

const adminUploadDocumentForUser = catchAsync(
  async (req: Request, res: Response) => {
    const taxId = String(req.params.taxId || '');
    const { type } = req.body;
    const file = req.file;

    const result = await TaxService.adminUploadDocumentForUserToDB(
      taxId,
      file as Express.Multer.File,
      type,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Document uploaded for user successfully',
      data: result,
    });
  },
);

const payTaxStepThree = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.initTaxStepThreePaymentToDB(
    userId,
    taxId,
    String(req.user?.role || ''),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax step-3 payment initialized successfully',
    data: result,
  });
});

// The tax-order return URLs share the payments flow: the outcome always comes
// from EPS, never from which URL the browser landed on.
const taxPaymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(req.body?.tran_id || req.query?.tran_id || '');
  const result = await paymentService.success(transactionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment success processed and order placed',
    data: result,
  });
});

const taxPaymentFail = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(req.body?.tran_id || req.query?.tran_id || '');
  const result = await paymentService.fail(transactionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment status updated',
    data: result,
  });
});

const taxPaymentCancel = catchAsync(async (req: Request, res: Response) => {
  const transactionId = String(req.body?.tran_id || req.query?.tran_id || '');
  const result = await paymentService.cancel(transactionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment status updated',
    data: result,
  });
});

const getSingleTaxOrder = catchAsync(async (req: Request, res: Response) => {
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.getTaxOrderByIdFromDB(taxId);

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

const updateTaxOrder = catchAsync(async (req: Request, res: Response) => {
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.updateTaxOrderToDB(taxId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax order updated successfully',
    data: result,
  });
});

const applyCoupon = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.applyCouponToTaxOrderToDB(
    userId,
    taxId,
    String(req.body?.code || ''),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon applied successfully',
    data: result,
  });
});

const removeCoupon = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.userId || '');
  const taxId = String(req.params.taxId || '');
  const result = await TaxService.removeCouponFromTaxOrderInDB(userId, taxId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon removed successfully',
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
  getSingleTaxOrder,
  getMyTaxOrders,
  getAllTaxOrders,
  updateTaxOrder,
  adminUploadDocumentForUser,
  applyCoupon,
  removeCoupon,
};
