import { Schema, model } from 'mongoose';

const taxModel = new Schema(
  {
    mobile: {
      type: String,
      required: true,
    },
    etin_number: {
      type: String,
      required: true,
    },
    etin_file: {
      type: String,
      required: true,
    },
    salary_statement: {
      type: String,
      required: true,
    },
    gpf_statement: {
      type: String,
    },
    rpf_statement: {
      type: String,
    },
    pf_statement: {
      type: String,
    },
    nps_statement: {
      type: String,
    },
    bank_statement: {
      type: String,
      required: true,
    },
    land_deed: {
      type: String,
    },
    other_document: {
      type: String,
    },
    vechile_buy_recipt: {
      type: String,
    },
    vechile_tax_token: {
      type: String,
    },
    loan_statement: {
      type: String,
    },
    is_taxable_income: {
      type: Boolean,
      default: false,
      required: true,
    },
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
  }
);

export const Tax = model('Tax', taxModel);
