import AppError from '../../errors/AppError';
import { IncomeSource, ITax, IPersonalInformation } from './tax.interface';
import httpStatus from 'http-status';
import { Tax } from './tax.model';
import { Types } from 'mongoose';
import { Files } from '../files/files.model';
import { Payment } from '../payments/payment.model';
import { getPaymentsType } from './tax.constant';
import { paymentService } from '../payments/payment.service';
import { IPaymentDataForInit } from '../payments/payment.interface';
import { User } from '../users/user.model';
import { sendSMS } from '../../utils/smsService';

type StepOnePayload = {
  personal_information: IPersonalInformation;
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
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax data is required');
  }

  const { personal_information, source_of_income, tax_year } = taxData;
  const { name, email, phone } = personal_information || {};

  if (!personal_information) {
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
      status: 'documents_uploaded',
    },
    { new: true },
  );

  return result;
};

const initTaxStepThreePaymentToDB = async (userId: string, taxId: string) => {
  const taxOrder = await Tax.findById(taxId);

  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  if (!taxOrder.documents || taxOrder.documents.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please upload required documents first',
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

  const paymentData: IPaymentDataForInit = {
    orderId: taxId,
    userId,
    paymentFor: 'fee_amount',
  };

  const { gatewayPageURL } = await paymentService.inintPaymentToDb(paymentData);

  if (!gatewayPageURL) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to initialize SSLCommerz payment',
    );
  }

  return {
    gatewayPageURL,
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
      current_step: 3,
      status: 'order_placed',
      total_amount: feeAmount,
      total_paid_amount: feeAmount,
      ...getPaymentsType(payment.paymentFor),
    },
    { new: true },
  );
  // Fire-and-forget SMS — do not await so the response is not blocked
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
      const message = `Dear ${user.name}, BDT ${payment.amount} for ${label} received. Txn: ${transactionId} -Smart Tax BD`;
      return sendSMS(user.mobile, message);
    })
    .catch(() => {
      // SMS failure must never break the payment success flow
    });

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

const getTaxOrderByIdFromDB = async (taxId: string) => {
  const taxOrder = await Tax.findById(taxId).populate('documents');
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }
  const required_documents = getRequiredDocumentsFromTax(taxOrder);

  return {
    tax_order: taxOrder,
    required_documents,
  };
};

const getMyTaxOrdersFromDB = async (userId: string) => {
  const orders = await Tax.find({ userId }).sort({ createdAt: -1 });
  return orders;
};

const getAllTaxOrdersFromDB = async () => {
  const orders = await Tax.find().sort({ createdAt: -1 });
  return orders;
};

const updateTaxOrderToDB = async (taxId: string, taxData: Partial<ITax>) => {
  if (!taxId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax ID is required');
  }

  const taxOrder = await Tax.findById(taxId);
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  if (taxData?.fee_due_amount && taxOrder?.is_fee_due_amount_paid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fee due amount is already paid',
    );
  }

  if (taxData?.tax_payable_amount && taxOrder?.is_tax_payable_amount_paid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tax payable amount is already paid',
    );
  }

  const fee_due_amount = taxData.fee_due_amount ?? taxOrder.fee_due_amount ?? 0;
  const tax_payable_amount =
    taxData.tax_payable_amount ?? taxOrder.tax_payable_amount ?? 0;

  const getTotalAmount = () => {
    if (taxData?.fee_due_amount) {
      const total =
        (taxData?.total_amount ?? 0 - taxOrder.fee_due_amount) + fee_due_amount;
      return total;
    }

    if (taxData?.tax_payable_amount) {
      const total =
        (taxData?.total_amount ?? 0 - taxOrder.tax_payable_amount) +
        tax_payable_amount;
      return total;
    }

    return taxOrder.total_amount;
  };

  const result = await Tax.findByIdAndUpdate(
    taxId,
    {
      ...taxData,
      total_amount: getTotalAmount(),
      status: 'payment_pending',
    },
    { new: true },
  );

  const required_documents = getRequiredDocumentsFromTax(result as ITax);

  return {
    tax_order: result,
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
  getMyTaxOrdersFromDB,
  getAllTaxOrdersFromDB,
  updateTaxOrderToDB,
};
