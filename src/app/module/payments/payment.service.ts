import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { TUser } from '../users/user.interface';
import { User } from '../users/user.model';
import httpStatus from 'http-status';
import { Payment } from './payment.model';
import { sslcz } from '../../utils/ssl';
import config from '../../config';
import { IPayment, IPaymentDataForInit } from './payment.interface';
import { ITax } from '../Tax/tax.interface';
import { sendSMS } from '../../utils/smsService';
import { notificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE } from '../notifications/notification.constant';
import { getPaymentsType } from '../Tax/tax.constant';

const clientUrl = config.client_url;

const resolvePayableAmount = async (
  paymentData: IPaymentDataForInit,
  orderData: ITax,
) => {
  if (paymentData.paymentFor === 'fee_amount') {
    const feeAmount = orderData?.fee_amount || 0;
    if (feeAmount <= 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Fee amount is required');
    }
    return feeAmount;
  }

  if (paymentData.paymentFor === 'fee_due_amount') {
    const feeDueAmount = orderData?.fee_due_amount || 0;
    if (feeDueAmount <= 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Fee due amount is required');
    }
    return feeDueAmount;
  }

  if (paymentData.paymentFor === 'tax_payable_amount') {
    const taxPayableAmount = orderData?.tax_payable_amount || 0;
    if (taxPayableAmount <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Tax payable amount is required',
      );
    }
    return taxPayableAmount;
  }

  if (paymentData.paymentFor === 'remaining_all_amount') {
    const remainingAllAmount =
      orderData?.tax_payable_amount + orderData?.fee_due_amount;
    if (remainingAllAmount <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Remaining all amount is required',
      );
    }
    return remainingAllAmount;
  }
};

const inintPaymentToDb = async (paymentData: IPaymentDataForInit) => {
  if (!paymentData.orderId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order ID is required');
  }
  const orderData = await Tax.findById(paymentData.orderId).populate('userId');
  if (!orderData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  const user = orderData?.userId as unknown as TUser;
  const tran_id = new Types.ObjectId().toString();
  const payableAmount = await resolvePayableAmount(paymentData, orderData);

  const data = {
    total_amount: payableAmount,
    currency: 'BDT',
    tran_id: tran_id,
    success_url: `${clientUrl}/success?tran_id=${tran_id}&paymentFor=${paymentData.paymentFor}`,
    fail_url: `${clientUrl}/fail?tran_id=${tran_id}&paymentFor=${paymentData.paymentFor}`,
    cancel_url: `${clientUrl}/cancel?tran_id=${tran_id}&paymentFor=${paymentData.paymentFor}`,
    ipn_url: `${clientUrl}/ipn?tran_id=${tran_id}&paymentFor=${paymentData.paymentFor}`,
    shipping_method: 'Online',
    product_name: 'Tax.',
    product_category: 'Electronic',
    product_profile: 'general',
    cus_name: user.name,
    cus_email: user.email,
    cus_add1: 'Dhaka',
    cus_add2: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: user.mobile,
    cus_fax: user.mobile,
    ship_name: user.name,
    ship_add1: 'Dhaka',
    ship_add2: 'Dhaka',
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: 1000,
    ship_country: 'Bangladesh',
  };

  const sslResponse = await sslcz.init(data);

  if (!sslResponse?.GatewayPageURL) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to initialize SSLCommerz payment',
    );
  }

  await Payment.create({
    userId: user._id,
    orderId: orderData._id,
    amount: payableAmount,
    paymentFor: paymentData?.paymentFor || 'fee_amount',
    currency: 'BDT',
    status: 'pending',
    transaction_id: tran_id,
  });

  notificationService
    .sendNotification({
      recipientId: (user._id as string).toString(),
      type: NOTIFICATION_TYPE.PAYMENT_INITIATED,
      title: 'Payment Initiated',
      message: `Payment of BDT ${payableAmount} has been initiated.`,
      data: {
        orderId: orderData._id,
        amount: payableAmount,
        transactionId: tran_id,
      },
    })
    .catch(() => {});

  return {
    gatewayPageURL: sslResponse?.GatewayPageURL,
  };
};

const success = async (tran_id: string) => {
  if (!tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Transaction ID is required');
  }

  const payment = await Payment.findOne({ transaction_id: tran_id });
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  const order = await Tax.findById(payment.orderId);
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (payment.paymentFor === 'fee_amount') {
    order.is_fee_amount_paid = true;
    order.total_paid_amount = order.total_paid_amount + payment.amount;
    await order.save();
  }

  if (payment.paymentFor === 'fee_due_amount') {
    order.is_fee_due_amount_paid = true;
    order.total_paid_amount = order.total_paid_amount + payment.amount;
    await order.save();
  }

  if (payment.paymentFor === 'tax_payable_amount') {
    order.is_tax_payable_amount_paid = true;
    order.total_paid_amount = order.total_paid_amount + payment.amount;
    await order.save();
  }

  if (payment.paymentFor === 'remaining_all_amount') {
    order.is_tax_payable_amount_paid = true;
    order.is_fee_due_amount_paid = true;
    order.total_paid_amount = order.total_paid_amount + payment.amount;
    await order.save();
  }

  if (
    payment &&
    payment.status !== 'completed' &&
    payment.paymentFor !== 'remaining_all_amount'
  ) {
    payment.status = 'completed';
    await payment.save();

    // Fire-and-forget SMS — only on the first transition to 'completed'
    // so duplicate callbacks never send a second message
    User.findById(payment.userId)
      .select('mobile name')
      .then(user => {
        if (!user?.mobile) return;
        const labelMap: Record<string, string> = {
          fee_amount: 'Service Fee',
          fee_due_amount: 'Due Fee',
          tax_payable_amount: 'Tax Payable Amount',
          remaining_all_amount: 'All Remaining Amount',
        };
        const label = labelMap[payment.paymentFor] ?? payment.paymentFor;
        const message = `Dear ${user.name}, BDT ${payment.amount} for ${label} received. Smart Tax BD`;
        return sendSMS(user.mobile, message);
      })
      .catch(() => {
        // SMS failure must never break the payment success flow
      });

    notificationService
      .sendNotification({
        recipientId: payment.userId.toString(),
        type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `BDT ${payment.amount} received successfully. Transaction: ${tran_id}.`,
        data: {
          orderId: payment.orderId,
          amount: payment.amount,
          transactionId: tran_id,
        },
      })
      .catch(() => {});
  }

  return payment;
};

const fail = async (tran_id: string) => {
  if (!tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Transaction ID is required');
  }

  const payment = await Payment.findOne({ transaction_id: tran_id });
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  if (payment) {
    payment.status = 'failed';
    await payment.save();

    notificationService
      .sendNotification({
        recipientId: payment.userId.toString(),
        type: NOTIFICATION_TYPE.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: `Your payment of BDT ${payment.amount} has failed. Please try again.`,
        data: {
          orderId: payment.orderId,
          amount: payment.amount,
          transactionId: tran_id,
        },
      })
      .catch(() => {});
  }

  return payment;
};

const cancel = async (tran_id: string) => {
  if (!tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Transaction ID is required');
  }

  const payment = await Payment.findOne({ transaction_id: tran_id });
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  if (payment) {
    payment.status = 'cancelled';
    await payment.save();

    notificationService
      .sendNotification({
        recipientId: payment.userId.toString(),
        type: NOTIFICATION_TYPE.PAYMENT_CANCELLED,
        title: 'Payment Cancelled',
        message: `Your payment of BDT ${payment.amount} has been cancelled.`,
        data: {
          orderId: payment.orderId,
          amount: payment.amount,
          transactionId: tran_id,
        },
      })
      .catch(() => {});
  }

  return payment;
};

const getAllPayment = async () => {
  const payments = await Payment.find();
  return payments;
};

const getUserPayment = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }
  const payments = await Payment.find({ userId });
  return payments;
};

const getAPaymentByOrderId = async (orderId: string) => {
  if (!orderId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order ID is required');
  }

  const payments: (IPayment & { tax: ITax })[] = await Payment.aggregate([
    {
      $match: { orderId: new Types.ObjectId(orderId) },
    },
    {
      $lookup: {
        from: 'taxes',
        localField: 'orderId',
        foreignField: '_id',
        as: 'tax',
      },
    },
    {
      $unwind: {
        path: '$tax',
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);
  if (!payments.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  return payments;
};

const recordCashPaymentToDB = async ({
  orderId,
  paymentFor,
}: {
  orderId: string;
  paymentFor: IPayment['paymentFor'];
  userId: string;
}) => {
  if (!orderId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order ID is required');
  }

  const order = await Tax.findById(orderId);
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Guard: never record a bucket that is already paid
  if (paymentFor === 'fee_amount' && order.is_fee_amount_paid) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Fee amount is already paid');
  }
  if (paymentFor === 'fee_due_amount' && order.is_fee_due_amount_paid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fee due amount is already paid',
    );
  }
  if (paymentFor === 'tax_payable_amount' && order.is_tax_payable_amount_paid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tax payable amount is already paid',
    );
  }
  if (
    paymentFor === 'remaining_all_amount' &&
    order.is_tax_payable_amount_paid &&
    order.is_fee_due_amount_paid
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Remaining amount is already paid',
    );
  }

  const payableAmount = await resolvePayableAmount(
    { orderId, userId: order.userId.toString(), paymentFor },
    order,
  );

  const tran_id = new Types.ObjectId().toString();

  const payment = await Payment.create({
    userId: order.userId,
    orderId: order._id,
    amount: payableAmount,
    paymentFor,
    currency: 'BDT',
    status: 'completed',
    transaction_id: tran_id,
    payment_method: 'cash',
  });

  // Merge the newly-paid flags onto the current order so we can decide status.
  const paidFlags = getPaymentsType(paymentFor);
  const isFeeAmountPaid =
    order.is_fee_amount_paid || !!paidFlags?.is_fee_amount_paid;

  const updatedOrder = await Tax.findByIdAndUpdate(
    order._id,
    {
      ...paidFlags,
      total_paid_amount: (order.total_paid_amount || 0) + (payableAmount || 0),
      // Once the service fee is settled the order is officially placed — mirrors
      // the gateway success flow so the user-facing status stops showing pending.
      ...(isFeeAmountPaid ? { status: 'order_placed' } : {}),
    },
    { new: true },
  );

  // Fire-and-forget SMS — never block or break the flow
  User.findById(order.userId)
    .select('mobile name')
    .then(user => {
      if (!user?.mobile) return;
      const labelMap: Record<string, string> = {
        fee_amount: 'Service Fee',
        fee_due_amount: 'Due Fee',
        tax_payable_amount: 'Tax Payable Amount',
        remaining_all_amount: 'All Remaining Amount',
      };
      const label = labelMap[paymentFor] ?? paymentFor;
      const message = `Dear ${user.name}, BDT ${payableAmount} for ${label} received in cash. Smart Tax BD`;
      return sendSMS(user.mobile, message);
    })
    .catch(() => {});

  notificationService
    .sendNotification({
      recipientId: order.userId.toString(),
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: 'Payment Received',
      message: `BDT ${payableAmount} received in cash. Transaction: ${tran_id}.`,
      data: {
        orderId: order._id,
        amount: payableAmount,
        transactionId: tran_id,
      },
    })
    .catch(() => {});

  return {
    payment,
    tax_order: updatedOrder,
  };
};

export const paymentService = {
  inintPaymentToDb,
  recordCashPaymentToDB,
  getAllPayment,
  getUserPayment,
  getAPaymentByOrderId,
  success,
  fail,
  cancel,
};
