import { Schema, model } from 'mongoose';
import { IncomeSource, ITax } from './tax.interface';

const fee_amount = 1000;

const taxModel = new Schema<ITax>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    is_self: {
      type: Boolean,
      required: true,
      default: true,
    },
    for_other_person: {
      type: Boolean,
      required: true,
      default: false,
    },
    personal_iformation: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
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
      type: [String],
      enum: Object.values(IncomeSource),
      required: true,
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
    fee_amount: {
      type: Number,
      required: true,
      default: fee_amount || 0,
    },
    fee_due_amount: {
      type: Number,
      required: true,
      default: fee_amount || 0,
    },
    tax_paid_date: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const Tax = model('Tax', taxModel);
