import { USER_ROLE } from '../users/user.constant';
import AppError from '../../errors/AppError';
import { ITax, IPersonalInformation } from './tax.interface';
import { IAppliedCoupon } from '../coupons/coupon.interface';
import httpStatus from 'http-status';
import { Tax } from './tax.model';
import { Types } from 'mongoose';
import { Files } from '../files/files.model';
import { Payment } from '../payments/payment.model';
import { getPaymentsType } from './tax.constant';
import { paymentService } from '../payments/payment.service';
import { IPaymentDataForInit } from '../payments/payment.interface';
import { notificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE } from '../notifications/notification.constant';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import taxTypesModel from '../taxTypes/tax.types.model';
import {
  getPayableFeeAmount,
  getRequiredDocumentsFromTax,
  syncTaxDocumentState,
} from './tax.utils';
import { CouponService } from '../coupons/coupon.service';
import { calculateCouponDiscount } from '../coupons/coupon.utils';

type StepOnePayload = {
  personal_information: IPersonalInformation;
  tax_year: string;
  tax_types?: string[];
  // LEGACY app ≤ v14: it still submits tax type values under this name.
  // Folded into `tax_types` by `normalizeLegacyStepOne`; never stored.
  source_of_income?: string[];
  income_from_ldt_company?: boolean;
  income_from_partnership_firm?: boolean;
  are_you_get_notice_from_tax_office?: boolean;
  for_other_person?: boolean;
  is_self?: boolean;
};

/**
 * LEGACY app ≤ v14 — delete with `legacyIncomeSource.route.ts` once no
 * installs that old remain. That app lists what `/income-sources` returns
 * (active tax types) and submits the picked values as `source_of_income`.
 */
const normalizeLegacyStepOne = (taxData: StepOnePayload): StepOnePayload => {
  if (!taxData || !Array.isArray(taxData.source_of_income)) {
    return taxData;
  }

  const { source_of_income, ...rest } = taxData;
  return {
    ...rest,
    tax_types: Array.from(
      new Set([...(rest.tax_types || []), ...source_of_income]),
    ),
  };
};

const validateStepOneData = async (taxData: StepOnePayload) => {
  if (!taxData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax data is required');
  }

  const { personal_information, tax_types, tax_year } = taxData;
  const { name, phone } = personal_information || {};

  if (!personal_information) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Personal information is required',
    );
  }

  if (!name || !phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Name and phone are required in personal information',
    );
  }

  if (!Array.isArray(tax_types) || tax_types.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one tax type is required',
    );
  }

  if (!tax_year) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax year is required');
  }

  // The Tax schema carries no tax-type enum, so the catalog is what decides
  // which values are acceptable.
  const known = await taxTypesModel
    .find({ value: { $in: tax_types }, isActive: true })
    .select('value');
  const knownValues = new Set(known.map(taxType => taxType.value));
  const unknown = tax_types.filter(value => !knownValues.has(value));

  if (unknown.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Unknown tax type: ${unknown.join(', ')}`,
    );
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

  taxData = normalizeLegacyStepOne(taxData);
  await validateStepOneData(taxData);

  const payload = {
    ...taxData,
    userId,
    status: 'draft' as const,
    current_step: 1 as const,
  };

  const result = await Tax.create(payload);
  const required_documents = await getRequiredDocumentsFromTax(result);

  notificationService
    .sendNotification({
      recipientId: userId,
      type: NOTIFICATION_TYPE.TAX_ORDER_CREATED,
      title: 'Tax Order Created',
      message: `Your tax order for ${result.tax_year} has been created successfully.`,
      data: { orderId: result._id, taxYear: result.tax_year },
    })
    .catch(() => {});

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

  taxData = normalizeLegacyStepOne(taxData);
  await validateStepOneData(taxData);
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

  const required_documents = await getRequiredDocumentsFromTax(result as ITax);

  return {
    tax_order: result,
    required_documents,
  };
};

const uploadTaxStepTwoDocumentsToDB = async (
  userId: string,
  taxId: string,
  documentIds: string[],
  skip_upload?: boolean,
) => {
  const taxOrder = await assertTaxOrderOwnership(taxId, userId);

  if (skip_upload) {
    const result = await Tax.findByIdAndUpdate(
      taxId,
      {
        files_upload_pending: true,
        current_step: 2,
        status: 'payment_pending',
      },
      { new: true },
    );
    return result;
  }

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one document is required',
    );
  }

  const requiredDocuments = await getRequiredDocumentsFromTax(taxOrder);

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

  const updatePayload: Record<string, unknown> = {
    // Merge, never replace: an admin may have uploaded a document on the user's
    // behalf before they reached this step, and that file must not be dropped.
    $addToSet: { documents: { $each: validDocumentIds } },
    $set: {
      current_step: 2,
      status: 'documents_uploaded',
      ...(taxOrder.files_upload_pending
        ? { files_upload_pending: false }
        : {}),
    },
  };

  const result = await Tax.findByIdAndUpdate(taxId, updatePayload, {
    new: true,
  });

  notificationService
    .sendNotification({
      recipientId: userId,
      type: NOTIFICATION_TYPE.DOCUMENTS_UPLOADED,
      title: 'Documents Uploaded',
      message: 'Your tax documents have been uploaded successfully.',
      data: { orderId: taxId },
    })
    .catch(() => {});

  return result;
};

const initTaxStepThreePaymentToDB = async (
  userId: string,
  taxId: string,
  role: string,
) => {
  const taxOrder = await Tax.findById(taxId);

  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  // A user may only pay for their own order; admins may act on any order.
  if (role === USER_ROLE.user && taxOrder.userId.toString() !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only pay for your own orders',
    );
  }

  if (!taxOrder.files_upload_pending) {
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
    const requiredDocuments = await getRequiredDocumentsFromTax(taxOrder);
    const missingDocuments = requiredDocuments.filter(
      doc => !uploadedTypes.has(doc),
    );

    if (missingDocuments.length > 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot pay before completing required documents: ${missingDocuments.join(', ')}`,
      );
    }
  }

  // A coupon can wipe the fee out entirely. No gateway can charge zero, so
  // settle the order here instead of calling `inintPaymentToDb` (which throws
  // on a non-positive amount) and tell the client not to redirect.
  const payableFee = getPayableFeeAmount(taxOrder);
  if (payableFee <= 0) {
    const tran_id = new Types.ObjectId().toString();

    await Payment.create({
      userId: taxOrder.userId,
      orderId: taxOrder._id,
      amount: 0,
      paymentFor: 'fee_amount',
      currency: 'BDT',
      status: 'completed',
      transaction_id: tran_id,
      payment_method: 'coupon',
    });

    const settledOrder = await Tax.findByIdAndUpdate(
      taxOrder._id,
      {
        current_step: 3,
        status: 'order_placed',
        total_amount: 0,
        total_paid_amount: 0,
        ...getPaymentsType('fee_amount'),
      },
      { new: true },
    );

    notificationService
      .sendNotification({
        recipientId: taxOrder.userId.toString(),
        type: NOTIFICATION_TYPE.TAX_ORDER_PLACED,
        title: 'Tax Order Placed',
        message:
          'Your tax order has been placed. The coupon covered the full service fee, so nothing is due.',
        data: {
          orderId: taxOrder._id,
          transactionId: tran_id,
          amount: 0,
        },
      })
      .catch(() => {});

    return {
      gatewayPageURL: null,
      paid: true,
      reason: 'coupon' as const,
      tax_order: settledOrder,
    };
  }

  const paymentData: IPaymentDataForInit = {
    orderId: taxId,
    userId,
    paymentFor: 'fee_amount',
    role,
  };

  const result = await paymentService.inintPaymentToDb(paymentData);

  // An earlier checkout turned out to have gone through: the order is placed.
  if (result.paid) {
    return {
      gatewayPageURL: null,
      paid: true,
      reason: result.reason,
      tax_order: await Tax.findById(taxOrder._id),
    };
  }

  const { gatewayPageURL } = result;
  if (!gatewayPageURL) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to initialize EPS payment',
    );
  }

  return {
    gatewayPageURL,
    paid: false,
  };
};

const getTaxOrderByIdFromDB = async (taxId: string) => {
  if (!Types.ObjectId.isValid(taxId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid tax order ID');
  }

  const taxOrder = await Tax.findById(taxId).populate('documents');
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  // `uploaded_files` is the authoritative list — `documents` is a cache that can
  // still be stale on orders created before it was kept in sync. Not paginated:
  // an order holds a handful of files, and a page limit would silently hide some.
  const [required_documents, uploaded_files] = await Promise.all([
    getRequiredDocumentsFromTax(taxOrder),
    Files.find({ orderId: taxOrder._id }).sort({ createdAt: -1 }),
  ]);

  return {
    tax_order: taxOrder,
    required_documents,
    uploaded_files,
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

  // Only block when the admin actually changes a paid amount to a different
  // value — sending the unchanged (pre-filled) amount must not fail a
  // status-only edit.
  if (
    taxData?.fee_due_amount !== undefined &&
    taxData.fee_due_amount !== taxOrder.fee_due_amount &&
    taxOrder?.is_fee_due_amount_paid
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fee due amount is already paid',
    );
  }

  if (
    taxData?.tax_payable_amount !== undefined &&
    taxData.tax_payable_amount !== taxOrder.tax_payable_amount &&
    taxOrder?.is_tax_payable_amount_paid
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tax payable amount is already paid',
    );
  }

  const fee_due_amount = taxData.fee_due_amount ?? taxOrder.fee_due_amount ?? 0;
  const tax_payable_amount =
    taxData.tax_payable_amount ?? taxOrder.tax_payable_amount ?? 0;

  const amountsChanged =
    taxData.fee_due_amount !== undefined ||
    taxData.tax_payable_amount !== undefined;

  // Coupon-discounted fee, so an admin edit does not quietly restore the full
  // service fee on a discounted order.
  const total_amount =
    getPayableFeeAmount(taxOrder) + fee_due_amount + tax_payable_amount;

  // Respect an explicitly chosen status; only fall back to 'payment_pending'
  // when amounts changed and no status was sent.
  const nextStatus =
    taxData.status ?? (amountsChanged ? 'payment_pending' : taxOrder.status);

  const result = await Tax.findByIdAndUpdate(
    taxId,
    {
      ...taxData,
      total_amount,
      status: nextStatus,
    },
    { new: true },
  );

  const required_documents = await getRequiredDocumentsFromTax(result as ITax);

  if (result) {
    notificationService
      .sendNotification({
        recipientId: result.userId.toString(),
        type: NOTIFICATION_TYPE.TAX_AMOUNTS_UPDATED,
        title: 'Payment Required',
        message:
          'Your tax order amounts have been updated. Please proceed with payment.',
        data: {
          orderId: taxId,
          feeDueAmount: result.fee_due_amount,
          taxPayableAmount: result.tax_payable_amount,
          totalAmount: result.total_amount,
        },
      })
      .catch(() => {});
  }

  return {
    tax_order: result,
    required_documents,
  };
};

const adminUploadDocumentForUserToDB = async (
  taxId: string,
  file: Express.Multer.File,
  docType: string,
) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File is required');
  }

  if (!docType) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Document type is required');
  }

  if (!Types.ObjectId.isValid(taxId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid tax order ID');
  }

  const taxOrder = await Tax.findById(taxId);
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  const fileName =
    file.mimetype === 'application/pdf'
      ? file.originalname.replace(/\s+/g, '_')
      : file.originalname.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');

  const { secure_url } = (await sendImageToCloudinary(
    fileName,
    file.path,
    file.mimetype,
  )) as { secure_url: string };

  const fileData = await Files.create({
    name: docType,
    type: docType,
    file: secure_url,
    userId: taxOrder.userId,
    orderId: taxId,
  });

  const missingDocuments =
    (await syncTaxDocumentState(taxId))?.missing_documents ?? [];

  return {
    file: fileData,
    files_upload_pending: missingDocuments.length > 0,
    missing_documents: missingDocuments,
  };
};

/** Orders past the point where the service fee is settled reject coupon edits. */
const assertCouponEditable = (taxOrder: ITax, userId: string) => {
  if (String(taxOrder.userId) !== String(userId)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not allowed to modify this order',
    );
  }

  if (
    taxOrder.is_fee_amount_paid ||
    taxOrder.status === 'order_placed' ||
    taxOrder.status === 'completed'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'A coupon cannot be changed once the service fee is settled',
    );
  }
};

/** `total_amount` after a coupon change, using the same formula as the admin edit. */
const recomputeTotalAmount = (
  taxOrder: ITax,
  appliedCoupon: IAppliedCoupon | undefined,
) =>
  getPayableFeeAmount({
    ...taxOrder.toObject(),
    applied_coupon: appliedCoupon,
  }) +
  Number(taxOrder.fee_due_amount || 0) +
  Number(taxOrder.tax_payable_amount || 0);

const applyCouponToTaxOrderToDB = async (
  userId: string,
  taxId: string,
  code: string,
) => {
  const taxOrder = await Tax.findById(taxId);
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  assertCouponEditable(taxOrder, userId);

  const coupon = await CouponService.validateCouponByCode(code);

  const discountAmount = calculateCouponDiscount(coupon, taxOrder.fee_amount);
  if (discountAmount <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This coupon does not reduce the service fee for this order',
    );
  }

  // Frozen snapshot: a later edit or deletion of the coupon must not reprice
  // this order.
  const appliedCoupon: IAppliedCoupon = {
    couponId: coupon._id as Types.ObjectId,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discount_amount: discountAmount,
    applied_at: new Date(),
  };

  const result = await Tax.findByIdAndUpdate(
    taxOrder._id,
    {
      applied_coupon: appliedCoupon,
      total_amount: recomputeTotalAmount(taxOrder, appliedCoupon),
    },
    { new: true },
  );

  return { tax_order: result };
};

const removeCouponFromTaxOrderInDB = async (userId: string, taxId: string) => {
  const taxOrder = await Tax.findById(taxId);
  if (!taxOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax order not found');
  }

  assertCouponEditable(taxOrder, userId);

  if (!taxOrder.applied_coupon?.code) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No coupon is applied to this order',
    );
  }

  const result = await Tax.findByIdAndUpdate(
    taxOrder._id,
    {
      $unset: { applied_coupon: 1 },
      $set: { total_amount: recomputeTotalAmount(taxOrder, undefined) },
    },
    { new: true },
  );

  return { tax_order: result };
};

export const TaxService = {
  createTaxStepOneToDB,
  updateTaxStepOneToDB,
  uploadTaxStepTwoDocumentsToDB,
  initTaxStepThreePaymentToDB,
  getTaxOrderByIdFromDB,
  getMyTaxOrdersFromDB,
  getAllTaxOrdersFromDB,
  updateTaxOrderToDB,
  adminUploadDocumentForUserToDB,
  applyCouponToTaxOrderToDB,
  removeCouponFromTaxOrderInDB,
};
