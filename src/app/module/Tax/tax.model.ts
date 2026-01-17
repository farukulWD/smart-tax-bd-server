import { Schema, model } from 'mongoose';

const taxModel = new Schema(
  {
    mobile: {
      type: String,
      required: true,
    },
    tax_or_vat_number: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    is_taxable_income: {
      type: Boolean,
      default: false,
      required: true,
    },
    tax_types: [
      {
        ref: 'TaxType',
        type: Schema.Types.ObjectId,
        required: true,
      },
    ],
    status: {
      type: String,
      default: 'pending',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    payable_amount: {
      type: Number,
      default: 0,
    },
    tax_year: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Tax = model('Tax', taxModel);
