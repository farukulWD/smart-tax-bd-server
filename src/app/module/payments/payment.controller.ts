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
  };

  const sslResponse = await paymentService.inintPaymentToDb(paymentData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment initiated successfully',
    data: sslResponse,
  });
});

// const ipn = catchAsync(async (req, res) => {
//   const { tran_id, status } = req.body;
//   const payment = await paymentService.ipn(tran_id, status);
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: 'Payment processed successfully',
//     data: payment,
//   });
// });

const success = catchAsync(async (req, res) => {
  const { tran_id } = req.body;
  const payment = await paymentService.success(tran_id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment processed successfully',
    data: payment,
  });
});

const fail = catchAsync(async (req, res) => {
  const { tran_id } = req.body;
  const payment = await paymentService.fail(tran_id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment failed successfully',
    data: payment,
  });
});

const cancel = catchAsync(async (req, res) => {
  const { tran_id } = req.body;
  const payment = await paymentService.cancel(tran_id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment cancelled successfully',
    data: payment,
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
  const payment = await paymentService.getAPaymentByOrderId(orderId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment fetched successfully',
    data: payment,
  });
});

export const paymentController = {
  initPayment,
  getAllPayment,
  getUserPayment,
  getAPaymentByOrderId,
  success,
  fail,
  cancel,
};
