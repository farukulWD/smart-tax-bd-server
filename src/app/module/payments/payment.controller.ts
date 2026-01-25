import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { paymentService } from './payment.service';

const initPayment = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.user.userId;
  const paymentData = {
    orderId,
    userId,
    status: 'pending',
  };

  const sslResponse = await paymentService.inintPaymentToDb(paymentData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment initiated successfully',
    data: sslResponse,
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

export const paymentController = {
  initPayment,
  getAllPayment,
  getUserPayment,
};
