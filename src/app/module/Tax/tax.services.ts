import AppError from '../../errors/AppError';
import { IncomeSource, ITax, IPersonalInformation } from './tax.interface';
import httpStatus from 'http-status';
import { Tax } from './tax.model';
import { Types } from 'mongoose';
import { Files } from '../files/files.model';
import { Payment } from '../payments/payment.model';
import { sslcz } from '../../utils/ssl';
import config from '../../config';

const paymentBaseUrl = config.payment_base_url || '';

type StepOnePayload = {
  personal_iformation: IPersonalInformation;
  tax_year: string;
  source_of_income: IncomeSource[];
  income_from_ldt_company?: boolean;
  income_from_partnership_firm?: boolean;
  are_you_get_notice_from_tax_office?: boolean;
  for_other_person?: boolean;
  is_self?: boolean;
};

const COMMON_REQUIRED_DOCUMENTS = [
  'TIN Certificate',
  'NID Copy',
  'Bank Statement',
];

const INCOME_SOURCE_DOCUMENT_MAP: Partial<Record<IncomeSource, string[]>> = {
  [IncomeSource.GovtJob]: ['Salary Statement', 'Tax Deduction Copy'],
  [IncomeSource.PrivateJob]: ['Salary Statement', 'Tax Deduction Copy'],
  [IncomeSource.Business]: [
    'Trade License',
    'Purchase Statement',
    'Sales or Received Statement',
    'Profit & Loss Statement',
    'Balance Sheet',
  ],
  [IncomeSource.Rent]: ['Tax Token'],
  [IncomeSource.Agriculture]: ['Others Documents'],
  [IncomeSource.FinancialAsset]: [
    'DPS Certificate',
    'FDR Certificate',
    'Sonchoypotro Certificate',
    'Insurance Certificate',
    'Share Certificate',
    'Pension Scheme Certificate',
  ],
  [IncomeSource.CapitalGain]: [
    'Land Purchase Documents',
    'Flat Purchase Documents',
    'Vehicle Purchase Documents',
  ],
  [IncomeSource.OthersSource]: ['Others Documents'],
  [IncomeSource.ForignRemitance]: ['Bank Statement'],
};

const getRequiredDocumentsFromTax = (taxData: Partial<ITax>) => {
  const required = new Set<string>(COMMON_REQUIRED_DOCUMENTS);
  const sources = Array.isArray(taxData.source_of_income)
    ? taxData.source_of_income
    : [];

  sources.forEach(source => {
    (INCOME_SOURCE_DOCUMENT_MAP[source] || []).forEach(doc =>
      required.add(doc),
    );
  });

  if (taxData.are_you_get_notice_from_tax_office) {
    required.add('Notice from Income Tax Office');
  }

  if (taxData.income_from_partnership_firm || taxData.income_from_ldt_company) {
    required.add('Balance Sheet');
  }

  return Array.from(required);
};

const validateStepOneData = (taxData: StepOnePayload) => {
  if (!taxData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax step-1 data is required');
  }

  const { personal_iformation, source_of_income, tax_year } = taxData;
  const { name, email, phone } = personal_iformation || {};

  if (!personal_iformation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Personal information is required',
    );
  }

  if (!name || !email || !phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Name, email, and phone are required in personal information',
    );
  }

  if (!source_of_income || source_of_income.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one source of income is required',
    );
  }

  if (!tax_year) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax year is required');
  }
};

const assertTaxOrderOwnership = async (taxId: string, userId: string) => {
  if (!Types.ObjectId.isValid(taxId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid tax order ID');
  }
  const taxOrder = await Tax.findById(taxId);
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }
  if (taxOrder.userId.toString() !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not allowed to update this tax order',
    );
  }
  return taxOrder;
};

const createTaxStepOneToDB = async (
  userId: string,
  taxData: StepOnePayload,
) => {
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  validateStepOneData(taxData);

  const payload = {
    ...taxData,
    userId,
    status: 'draft' as const,
    current_step: 1 as const,
  };

  const result = await Tax.create(payload);
  const required_documents = getRequiredDocumentsFromTax(result);

  return {
    tax_order: result,
    required_documents,
  };
};

const updateTaxStepOneToDB = async (
  userId: string,
  taxId: string,
  taxData: StepOnePayload,
) => {
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  validateStepOneData(taxData);
  await assertTaxOrderOwnership(taxId, userId);

  const result = await Tax.findByIdAndUpdate(
    taxId,
    {
      ...taxData,
      current_step: 1,
      status: 'draft',
    },
    { new: true },
  );

  const required_documents = getRequiredDocumentsFromTax(result as ITax);

  return {
    tax_order: result,
    required_documents,
  };
};

const uploadTaxStepTwoDocumentsToDB = async (
  userId: string,
  taxId: string,
  documentIds: string[],
) => {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one document is required',
    );
  }

  const taxOrder = await assertTaxOrderOwnership(taxId, userId);
  const requiredDocuments = getRequiredDocumentsFromTax(taxOrder);

  const validDocumentIds = documentIds.filter(id => Types.ObjectId.isValid(id));
  if (validDocumentIds.length !== documentIds.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid document ID found');
  }

  const files = await Files.find({
    _id: { $in: validDocumentIds },
    userId: taxOrder.userId,
  }).select('type');

  if (files.length !== validDocumentIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Some documents are invalid or do not belong to this user',
    );
  }

  const uploadedTypes = new Set(files.map(file => file.type));
  const missingDocuments = requiredDocuments.filter(
    doc => !uploadedTypes.has(doc),
  );

  if (missingDocuments.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Missing required documents: ${missingDocuments.join(', ')}`,
    );
  }

  const result = await Tax.findByIdAndUpdate(
    taxId,
    {
      documents: validDocumentIds,
      current_step: 2,
      status: 'in_progress',
    },
    { new: true },
  );

  return result;
};

const initTaxStepThreePaymentToDB = async (userId: string, taxId: string) => {
  const taxOrder = await assertTaxOrderOwnership(taxId, userId);

  if (!taxOrder.documents || taxOrder.documents.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please complete step-2 and upload required documents first',
    );
  }

  const files = await Files.find({
    _id: { $in: taxOrder.documents },
    userId: taxOrder.userId,
  }).select('type');
  const uploadedTypes = new Set(files.map(file => file.type));
  const requiredDocuments = getRequiredDocumentsFromTax(taxOrder);
  const missingDocuments = requiredDocuments.filter(
    doc => !uploadedTypes.has(doc),
  );

  if (missingDocuments.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot pay before completing required documents: ${missingDocuments.join(', ')}`,
    );
  }

  const feeAmount = Number(taxOrder.fee_amount || 0);

  if (feeAmount <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fee already paid for this order',
    );
  }

  const tran_id = new Types.ObjectId().toString();
  const customerName = taxOrder.personal_iformation?.name || 'Tax User';
  const customerEmail =
    taxOrder.personal_iformation?.email || 'noreply@example.com';
  const customerPhone = taxOrder.personal_iformation?.phone || '0000000000';

  const data = {
    total_amount: feeAmount,
    currency: 'BDT',
    tran_id,
    success_url: `${paymentBaseUrl}/api/v1/tax-orders/order-tax/payment/success`,
    fail_url: `${paymentBaseUrl}/api/v1/tax-orders/order-tax/payment/fail`,
    cancel_url: `${paymentBaseUrl}/api/v1/tax-orders/order-tax/payment/cancel`,
    ipn_url: `${paymentBaseUrl}/api/v1/tax-orders/order-tax/payment/ipn`,
    shipping_method: 'Online',
    product_name: 'Tax Fee',
    product_category: 'Service',
    product_profile: 'general',
    cus_name: customerName,
    cus_email: customerEmail,
    cus_add1: 'Dhaka',
    cus_add2: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: customerPhone,
    cus_fax: customerPhone,
    ship_name: customerName,
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
    userId: taxOrder.userId,
    orderId: taxOrder._id,
    amount: feeAmount,
    currency: 'BDT',
    status: 'pending',
    transaction_id: tran_id,
  });

  const result = await Tax.findByIdAndUpdate(
    taxId,
    {
      status: 'in_progress',
      current_step: 2,
    },
    { new: true },
  );

  return {
    tax_order: result,
    payable_amount: feeAmount,
    gatewayPageURL: sslResponse.GatewayPageURL,
    transaction_id: tran_id,
  };
};

const completeTaxOrderPaymentSuccessToDB = async (transactionId: string) => {
  if (!transactionId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Transaction ID is required');
  }

  const payment = await Payment.findOne({ transaction_id: transactionId });
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  if (payment.status === 'completed') {
    const existingOrder = await Tax.findById(payment.orderId);
    return {
      payment,
      tax_order: existingOrder,
    };
  }

  const taxOrder = await Tax.findById(payment.orderId);
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  const feeAmount = Number(taxOrder.fee_amount || 0);

  payment.status = 'completed';
  await payment.save();

  const updatedOrder = await Tax.findByIdAndUpdate(
    taxOrder._id,
    {
      tax_paid_amount: feeAmount,
      fee_due_amount: 0,
      tax_paid_date: new Date(),
      current_step: 3,
      status: 'order_placed',
    },
    { new: true },
  );

  return {
    payment,
    tax_order: updatedOrder,
  };
};

const markTaxOrderPaymentFailedToDB = async (transactionId: string) => {
  if (!transactionId) {
    return null;
  }

  const payment = await Payment.findOne({ transaction_id: transactionId });
  if (!payment) {
    return null;
  }

  if (payment.status !== 'completed') {
    payment.status = 'failed';
    await payment.save();
  }

  return payment;
};

const getTaxOrderByIdFromDB = async (userId: string, taxId: string) => {
  const taxOrder = await assertTaxOrderOwnership(taxId, userId);
  const required_documents = getRequiredDocumentsFromTax(taxOrder);

  return {
    tax_order: taxOrder,
    required_documents,
  };
};

export const TaxService = {
  createTaxStepOneToDB,
  updateTaxStepOneToDB,
  uploadTaxStepTwoDocumentsToDB,
  initTaxStepThreePaymentToDB,
  completeTaxOrderPaymentSuccessToDB,
  markTaxOrderPaymentFailedToDB,
  getTaxOrderByIdFromDB,
};
