import { Schema, model } from 'mongoose';
import { ITax } from './tax.interface';
import { TAX_TYPE_VALUES } from '../taxTypes/tax.types.interface';
import { DISCOUNT_TYPES } from '../coupons/coupon.interface';

const fee_amount = 1000;

const taxModel = new Schema<ITax>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    personal_information: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: true,
      },
      are_you_student: {
        type: Boolean,
        required: true,
        default: false,
      },
      are_you_house_wife: {
        type: Boolean,
        required: true,
        default: false,
      },
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'approved',
        'rejected',
        'cancelled',
        'completed',
        'in_progress',
        'order_placed',
        'on_hold',
        'archived',
        'deleted',
        'payment_pending',
        'documents_uploaded',
      ],
      default: 'draft',
    },
    current_step: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      required: true,
    },
    are_you_get_notice_from_tax_office: {
      type: Boolean,
      default: false,
      required: true,
    },
    income_from_partnership_firm: {
      type: Boolean,
      default: false,
      required: true,
    },
    income_from_ldt_company: {
      type: Boolean,
      default: false,
      required: true,
    },
    source_of_income: {
      // No `enum` here on purpose: income sources are an admin-managed
      // collection now, so a schema enum would reject any source added after
      // this deploy. Validated against active rows in `validateStepOneData`.
      type: [String],
      required: true,
    },
    tax_types: {
      type: [String],
      enum: [...TAX_TYPE_VALUES],
      default: [],
    },
    tax_year: {
      type: String,
      required: true,
    },
    documents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'File',
      },
    ],
    tax_payable_amount: {
      type: Number,
      required: true,
      default: 0,
    },
    is_tax_payable_amount_paid: {
      type: Boolean,
      default: false,
    },
    fee_amount: {
      type: Number,
      required: true,
      default: fee_amount || 0,
    },
    is_fee_amount_paid: {
      type: Boolean,
      default: false,
    },
    fee_due_amount: {
      type: Number,
      required: true,
      default: 0,
    },
    is_fee_due_amount_paid: {
      type: Boolean,
      default: false,
    },
    total_amount: {
      type: Number,
      default: fee_amount || 0,
    },
    total_paid_amount: {
      type: Number,
      default: 0,
    },
    tax_paid_date: {
      type: Date,
    },
    files_upload_pending: {
      type: Boolean,
      default: false,
    },
    // Snapshot, not a `ref` lookup: editing or deleting a coupon must never
    // reprice an order that was already placed under it. `discount_amount` is
    // the only field the money math reads — see `getPayableFeeAmount`.
    applied_coupon: {
      couponId: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
      },
      code: {
        type: String,
      },
      discountType: {
        type: String,
        enum: DISCOUNT_TYPES,
      },
      discountValue: {
        type: Number,
      },
      discount_amount: {
        type: Number,
        default: 0,
      },
      applied_at: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const Tax = model<ITax>('Tax', taxModel);
