import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { TUser } from '../users/user.interface';
import { User } from '../users/user.model';
import httpStatus from 'http-status';
import { Payment } from './payment.model';
import {
  generateMerchantTransactionId,
  initializeEpsPayment,
  verifyEpsTransaction,
} from '../../utils/eps';
import config from '../../config';
import { IPayment, IPaymentDataForInit } from './payment.interface';
import { ITax } from '../Tax/tax.interface';
import { sendSMS } from '../../utils/smsService';
import { notificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE } from '../notifications/notification.constant';
import { getPaymentsType } from '../Tax/tax.constant';
import { getPayableFeeAmount } from '../Tax/tax.utils';
import { USER_ROLE } from '../users/user.constant';
import { errorlogger } from '../../shared/logger';

const clientUrl = config.client_url;

const resolvePayableAmount = async (
  paymentData: IPaymentDataForInit,
  orderData: ITax,
) => {
  if (paymentData.paymentFor === 'fee_amount') {
    // Charge the coupon-discounted fee, never the list fee.
    const feeAmount = getPayableFeeAmount(orderData);
    if (feeAmount <= 0) {
      // A 100% coupon leaves nothing to collect. Callers must settle the order
      // before reaching payment init (see `initTaxStepThreePaymentToDB`) — a
      // gateway cannot charge zero.
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'There is no service fee left to collect for this order',
      );
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

const isAlreadyPaid = (order: ITax, paymentFor: IPayment['paymentFor']) => {
  if (paymentFor === 'fee_amount') return !!order.is_fee_amount_paid;
  if (paymentFor === 'fee_due_amount') return !!order.is_fee_due_amount_paid;
  if (paymentFor === 'tax_payable_amount') {
    return !!order.is_tax_payable_amount_paid;
  }
  return !!(order.is_tax_payable_amount_paid && order.is_fee_due_amount_paid);
};

// What the order asks for right now — it can differ from a pending payment's
// amount if a coupon or an admin edit changed the order after checkout began.
const getAmountDue = (order: ITax, paymentFor: IPayment['paymentFor']) => {
  if (paymentFor === 'fee_amount') return getPayableFeeAmount(order);
  if (paymentFor === 'fee_due_amount') return Number(order.fee_due_amount || 0);
  if (paymentFor === 'tax_payable_amount') {
    return Number(order.tax_payable_amount || 0);
  }
  return (
    Number(order.tax_payable_amount || 0) + Number(order.fee_due_amount || 0)
  );
};

const ALREADY_PAID_MESSAGES: Record<IPayment['paymentFor'], string> = {
  fee_amount: 'Fee amount is already paid',
  fee_due_amount: 'Fee due amount is already paid',
  tax_payable_amount: 'Tax payable amount is already paid',
  remaining_all_amount: 'Remaining amount is already paid',
};

// Guard: never charge or record a bucket that is already paid
const assertNotAlreadyPaid = (
  order: ITax,
  paymentFor: IPayment['paymentFor'],
) => {
  if (isAlreadyPaid(order, paymentFor)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      ALREADY_PAID_MESSAGES[paymentFor],
    );
  }
};

// Within this window an unfinished checkout may still be settling at EPS, so a
// new checkout for the same amount is refused instead of risking a double
// charge. Older unfinished checkouts no longer block the user.
const SETTLING_WINDOW_MS = 30 * 60 * 1000;

// A user who paid but never saw a confirmation tends to press "Pay" again.
// Before opening another checkout, ask EPS what happened to the earlier ones
// for the same order and amount, crediting any that actually went through.
const resolveOpenCheckouts = async (
  orderId: Types.ObjectId,
  paymentFor: IPayment['paymentFor'],
) => {
  const openPayments = await Payment.find({
    orderId,
    paymentFor,
    status: { $ne: 'completed' },
    transaction_id: { $regex: /^\d{10,}$/ },
    createdAt: { $gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  for (const open of openPayments) {
    let settled;
    try {
      settled = await settlePayment(open.transaction_id as string);
    } catch (error) {
      // A 400 here is an EPS success with the wrong amount: money was taken
      // and a person has to look at it before the user pays again.
      if (
        error instanceof AppError &&
        error.statusCode === httpStatus.BAD_REQUEST
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          'Your previous payment needs a manual check. Please contact support before paying again.',
        );
      }
      throw new AppError(
        httpStatus.SERVICE_UNAVAILABLE,
        'Could not check your previous payment. Please try again in a few minutes.',
      );
    }

    const isRecent =
      Date.now() - new Date(open.createdAt ?? 0).getTime() < SETTLING_WINDOW_MS;
    if (settled?.status === 'pending' && isRecent) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Your previous payment is still being processed. Please wait a few minutes, then refresh your order.',
      );
    }
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

  // A user may only pay for their own order; admins may act on any order.
  if (
    paymentData.role === USER_ROLE.user &&
    String(user?._id) !== String(paymentData.userId)
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only pay for your own orders',
    );
  }
  assertNotAlreadyPaid(orderData, paymentData.paymentFor);

  // An earlier checkout may have just been credited above; if it covered this
  // amount, there is nothing left to pay.
  await resolveOpenCheckouts(orderData._id, paymentData.paymentFor);
  const latestOrder = await Tax.findById(orderData._id);
  if (latestOrder && isAlreadyPaid(latestOrder, paymentData.paymentFor)) {
    return {
      gatewayPageURL: null,
      paid: true,
      reason: 'previous_payment' as const,
    };
  }

  const tran_id = generateMerchantTransactionId();
  const payableAmount = await resolvePayableAmount(paymentData, orderData);
  const returnQuery = `tran_id=${tran_id}&paymentFor=${paymentData.paymentFor}`;

  const epsResponse = await initializeEpsPayment({
    CustomerOrderId: tran_id,
    merchantTransactionId: tran_id,
    totalAmount: payableAmount as number,
    ipAddress: paymentData.ipAddress,
    successUrl: `${clientUrl}/success?${returnQuery}`,
    failUrl: `${clientUrl}/fail?${returnQuery}`,
    cancelUrl: `${clientUrl}/cancel?${returnQuery}`,
    customerName: user.name || 'Customer',
    customerEmail: user.email || config.email_user || '',
    customerAddress: 'Dhaka',
    customerCity: 'Dhaka',
    customerState: 'Dhaka',
    customerPostcode: '1000',
    customerCountry: 'BD',
    customerPhone: user.mobile || '',
    productName: 'Tax Service',
    productProfile: 'general',
    productCategory: 'Service',
    noOfItem: '1',
    valueA: orderData._id.toString(),
    valueB: paymentData.paymentFor,
  });

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
    gatewayPageURL: epsResponse.RedirectURL,
    paid: false,
  };
};

const PAYMENT_LABELS: Record<IPayment['paymentFor'], string> = {
  fee_amount: 'Service Fee',
  fee_due_amount: 'Due Fee',
  tax_payable_amount: 'Tax Payable Amount',
  remaining_all_amount: 'All Remaining Amount',
};

// EPS merchant transaction IDs are numeric; cash and coupon payments use
// ObjectIds and never go through the gateway.
const isEpsTransactionId = (transactionId?: string) =>
  /^\d{10,}$/.test(transactionId || '');

// Fields safe to return from the unauthenticated return-URL endpoints.
const toPublicPayment = (payment: IPayment) => ({
  transaction_id: payment.transaction_id,
  status: payment.status,
  amount: payment.amount,
  paymentFor: payment.paymentFor,
});

// Credits the order for a payment EPS has confirmed. The atomic status
// transition guarantees only one caller credits the order and notifies the
// user, however many callbacks or cron runs race on the same payment.
const completePayment = async (
  paymentId: Types.ObjectId | string,
  financialEntity: string | null,
) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $ne: 'completed' } },
    { $set: { status: 'completed', payment_method: financialEntity || 'EPS' } },
    { new: true },
  );
  if (!payment) {
    return Payment.findById(paymentId);
  }

  const order = await Tax.findById(payment.orderId);
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  const tran_id = payment.transaction_id;

  // The money was received either way, so it always counts towards
  // `total_paid_amount`. But it only settles the bucket if the bucket is still
  // open and the payment covers what is due *now*: a checkout started before
  // a coupon was removed or an admin raised an amount must not mark the
  // larger amount as paid.
  const alreadyPaid = isAlreadyPaid(order, payment.paymentFor);
  const amountDue = getAmountDue(order, payment.paymentFor);
  const settlesBucket = !alreadyPaid && payment.amount + 0.01 >= amountDue;
  if (!settlesBucket) {
    errorlogger.error(
      alreadyPaid
        ? `EPS payment ${tran_id} paid an already-settled ${payment.paymentFor} on order ${order._id}: duplicate payment, a refund may be due`
        : `EPS payment ${tran_id} paid ${payment.amount} but ${amountDue} is now due for ${payment.paymentFor} on order ${order._id}: needs manual review`,
    );
  }

  const isServiceFee = payment.paymentFor === 'fee_amount';
  const placesOrder = isServiceFee && settlesBucket;
  await Tax.findByIdAndUpdate(order._id, {
    total_paid_amount: (order.total_paid_amount || 0) + payment.amount,
    ...(settlesBucket ? getPaymentsType(payment.paymentFor) : {}),
    // Paying the service fee is what places the order.
    ...(placesOrder
      ? {
          current_step: 3,
          status: 'order_placed',
          total_amount: getPayableFeeAmount(order),
        }
      : {}),
  });

  const label = PAYMENT_LABELS[payment.paymentFor] ?? payment.paymentFor;

  // Fire-and-forget SMS — never block or break the flow
  User.findById(payment.userId)
    .select('mobile name')
    .then(user => {
      if (!user?.mobile) return;
      const message = `Dear ${user.name}, BDT ${payment.amount} for ${label} received. Txn: ${tran_id} -Smart Tax BD`;
      return sendSMS(user.mobile, message);
    })
    .catch(() => {});

  notificationService
    .sendNotification({
      recipientId: payment.userId.toString(),
      type: placesOrder
        ? NOTIFICATION_TYPE.TAX_ORDER_PLACED
        : NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: placesOrder ? 'Tax Order Placed' : 'Payment Successful',
      message: placesOrder
        ? `Your tax order has been placed successfully. Transaction: ${tran_id}.`
        : `BDT ${payment.amount} received successfully. Transaction: ${tran_id}.`,
      data: {
        orderId: payment.orderId,
        amount: payment.amount,
        transactionId: tran_id,
      },
    })
    .catch(() => {});

  return payment;
};

// Only a pending payment is closed, so repeated callbacks or cron runs do not
// notify twice. A closed payment can still complete later if EPS reports
// success (the user may finish paying after a timeout).
const closePayment = async (
  paymentId: Types.ObjectId | string,
  status: 'failed' | 'cancelled',
) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: 'pending' },
    { $set: { status } },
    { new: true },
  );
  if (!payment) {
    return Payment.findById(paymentId);
  }

  const isFailed = status === 'failed';
  notificationService
    .sendNotification({
      recipientId: payment.userId.toString(),
      type: isFailed
        ? NOTIFICATION_TYPE.PAYMENT_FAILED
        : NOTIFICATION_TYPE.PAYMENT_CANCELLED,
      title: isFailed ? 'Payment Failed' : 'Payment Cancelled',
      message: isFailed
        ? `Your payment of BDT ${payment.amount} has failed. Please try again.`
        : `Your payment of BDT ${payment.amount} has been cancelled.`,
      data: {
        orderId: payment.orderId,
        amount: payment.amount,
        transactionId: payment.transaction_id,
      },
    })
    .catch(() => {});

  return payment;
};

// Single source of truth for a payment's outcome: ask EPS. Which return URL
// the browser landed on (success / fail / cancel) is never trusted, since
// anyone can call those endpoints with any transaction ID.
const settlePayment = async (tran_id: string) => {
  if (!tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Transaction ID is required');
  }

  const payment = await Payment.findOne({ transaction_id: tran_id });
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  if (payment.status === 'completed' || !isEpsTransactionId(tran_id)) {
    return payment;
  }

  const transaction = await verifyEpsTransaction(tran_id);
  const status = transaction.Status.toLowerCase();

  if (status === 'success') {
    if (Math.abs(Number(transaction.TotalAmount) - payment.amount) >= 0.01) {
      // Left pending for manual review instead of crediting the wrong amount.
      errorlogger.error(
        `EPS amount mismatch for ${tran_id}: paid ${transaction.TotalAmount}, expected ${payment.amount}`,
      );
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Paid amount does not match the payment amount',
      );
    }
    return completePayment(payment._id, transaction.FinancialEntity);
  }
  if (['fail', 'failed', 'declined', 'rejected'].includes(status)) {
    return closePayment(payment._id, 'failed');
  }
  if (['cancel', 'cancelled', 'canceled', 'aborted'].includes(status)) {
    return closePayment(payment._id, 'cancelled');
  }

  // Any other status means EPS has not finished the transaction yet.
  return payment;
};

const success = async (tran_id: string) => {
  const payment = await settlePayment(tran_id);
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  if (payment.status !== 'completed') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      payment.status === 'pending'
        ? 'Payment has not been confirmed yet. Please check again shortly.'
        : `Payment was not successful (status: ${payment.status})`,
    );
  }
  return toPublicPayment(payment);
};

const fail = async (tran_id: string) => {
  const payment = await settlePayment(tran_id);
  return payment ? toPublicPayment(payment) : null;
};

const cancel = fail;

// Safety net for users who pay and then close the browser before reaching
// the return URL: EPS has no server-to-server callback, so poll it.
const reconcileOpenPayments = async () => {
  const now = Date.now();
  const openPayments = await Payment.find({
    status: { $ne: 'completed' },
    transaction_id: { $regex: /^\d{10,}$/ },
    createdAt: {
      $gte: new Date(now - 2 * 24 * 60 * 60 * 1000),
      $lte: new Date(now - 2 * 60 * 1000),
    },
  })
    .select('transaction_id')
    .limit(100);

  let completed = 0;
  for (const { transaction_id } of openPayments) {
    try {
      const result = await settlePayment(transaction_id as string);
      if (result?.status === 'completed') completed += 1;
    } catch (error) {
      errorlogger.error(`Failed to reconcile payment ${transaction_id}`, error);
    }
  }
  return { checked: openPayments.length, completed };
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

const getAPaymentByOrderId = async (
  orderId: string,
  requester: { userId: string; role: string },
) => {
  if (!orderId || !Types.ObjectId.isValid(orderId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order ID is required');
  }

  // Users only see payments for their own orders; admins see all.
  const ownerFilter =
    requester.role === USER_ROLE.user
      ? { userId: new Types.ObjectId(requester.userId) }
      : {};

  const payments: (IPayment & { tax: ITax })[] = await Payment.aggregate([
    {
      $match: { orderId: new Types.ObjectId(orderId), ...ownerFilter },
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

  assertNotAlreadyPaid(order, paymentFor);

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
  settlePayment,
  reconcileOpenPayments,
  success,
  fail,
  cancel,
};
