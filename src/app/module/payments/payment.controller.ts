import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { paymentService } from './payment.service';

const initPayment = catchAsync(async (req, res) => {
  const { orderId, paymentFor } = req.body;
  const userId = req.user.userId;
  const paymentData = {
    orderId,
    userId,
    paymentFor,
    ipAddress: req.ip,
    role: req.user.role,
  };

  const result = await paymentService.inintPaymentToDb(paymentData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment initiated successfully',
    data: result,
  });
});

const success = catchAsync(async (req, res) => {
  const tran_id = String(req.body?.tran_id || req.query?.tran_id || '');
  const payment = await paymentService.success(tran_id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment processed successfully',
    data: payment,
  });
});

const fail = catchAsync(async (req, res) => {
  const tran_id = String(req.body?.tran_id || req.query?.tran_id || '');
  const payment = await paymentService.fail(tran_id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment status updated',
    data: payment,
  });
});

const cancel = catchAsync(async (req, res) => {
  const tran_id = String(req.body?.tran_id || req.query?.tran_id || '');
  const payment = await paymentService.cancel(tran_id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment status updated',
    data: payment,
  });
});

const recordCashPayment = catchAsync(async (req, res) => {
  const { orderId, paymentFor } = req.body;
  const result = await paymentService.recordCashPaymentToDB({
    orderId,
    paymentFor,
    userId: req.user.userId,
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Cash payment recorded successfully',
    data: result,
  });
});

const getAllPayment = catchAsync(async (req, res) => {
  const payments = await paymentService.getAllPayment();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments fetched successfully',
    data: payments,
  });
});

const getUserPayment = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const payments = await paymentService.getUserPayment(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments fetched successfully',
    data: payments,
  });
});

const getAPaymentByOrderId = catchAsync(async (req, res) => {
  const orderId = req.params.orderId as string;
  const payment = await paymentService.getAPaymentByOrderId(orderId, {
    userId: req.user.userId,
    role: req.user.role,
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment fetched successfully',
    data: payment,
  });
});

export const paymentController = {
  initPayment,
  recordCashPayment,
  getAllPayment,
  getUserPayment,
  getAPaymentByOrderId,
  success,
  fail,
  cancel,
};
