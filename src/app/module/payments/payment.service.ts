
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { TUser } from '../users/user.interface';
import httpStatus from 'http-status';
import { Payment } from './payment.model';
import { sslcz } from '../../utils/ssl';
import config from '../../config';
import taxTypesModel from '../taxTypes/tax.types.model';

const clientUrl = config.client_url;

const resolvePayableAmount = async (orderData: any) => {
  const existingAmount = Number(orderData?.payable_amount || 0);
  if (existingAmount > 0) {
    return existingAmount;
  }

  const taxTypeIds = Array.isArray(orderData?.tax_types) ? orderData.tax_types : [];
  if (taxTypeIds.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payable amount is required');
  }

  const selectedTaxTypes = await taxTypesModel.find({
    _id: { $in: taxTypeIds },
  });

  const calculatedAmount = selectedTaxTypes.reduce(
    (sum, taxType) => sum + Number(taxType.rate || 0),
    0,
  );

  if (calculatedAmount <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payable amount is required');
  }

  await Tax.findByIdAndUpdate(orderData._id, { payable_amount: calculatedAmount });
  return calculatedAmount;
};

const inintPaymentToDb = async (paymentData: any) => {
  if (!paymentData.orderId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order ID is required');
  }
  const orderData = await Tax.findById(paymentData.orderId).populate('userId');
  if (!orderData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  const user = orderData?.userId as unknown as TUser;
  const tran_id = new Types.ObjectId().toString();
  const payableAmount = await resolvePayableAmount(orderData);

  

  const data = {
    total_amount: payableAmount,
    currency: 'BDT',
    tran_id: tran_id, 
    success_url: `${clientUrl}/success`,
    fail_url: `${clientUrl}/fail`,
    cancel_url: `${clientUrl}/cancel`,
    ipn_url: `${clientUrl}/ipn`,
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
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to initialize SSLCommerz payment');
  }

  await Payment.create({
    userId: user._id,
    orderId: orderData._id,
    amount: payableAmount,
    currency: 'BDT',
    status: 'pending',
    transaction_id: tran_id,
  })

  return {
    gatewayPageURL: sslResponse?.GatewayPageURL,
  };
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

export const paymentService = {
  inintPaymentToDb,
  getAllPayment,
  getUserPayment,
};
