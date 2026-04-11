import { Document, Schema, Types } from 'mongoose';

// define the income source enum
export enum IncomeSource {
  GovtJob = 'Income from Govt.Job',
  PrivateJob = 'Income from Private Job',
  Business = 'Income from Business',
  Rent = 'Income from Rent',
  Agriculture = 'Income from Agriculture',
  FinancialAsset = 'Income from Financial Asset',
  CapitalGain = 'Income from Capital Gain',
  OthersSource = 'Income from others Source',
  ForignRemitance = 'Income from Forign Remitance',
}

export type TaxStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'order_placed'
  | 'on_hold'
  | 'archived'
  | 'deleted'
  | 'payment_pending';

export interface IPersonalInformation {
  name: string;
  email: string;
  phone: string;
  are_you_student: boolean;
  are_you_house_wife: boolean;
}

// define the interface for tax
export interface ITax extends Document {
  _id: Types.ObjectId;
  userId: Schema.Types.ObjectId;
  personal_information: IPersonalInformation;
  status: TaxStatus;
  current_step: 1 | 2 | 3;
  are_you_get_notice_from_tax_office: boolean;
  income_from_partnership_firm: boolean;
  income_from_ldt_company: boolean;
  source_of_income: Array<IncomeSource>;
  tax_year: string;
  documents: Schema.Types.ObjectId[];
  tax_payable_amount: number;
  is_tax_payable_amount_paid: boolean;
  tax_paid_amount: number;
  fee_amount: number;
  is_fee_amount_paid: boolean;
  fee_due_amount: number;
  is_fee_due_amount_paid: boolean;
  tax_paid_date?: Date;
  total_amount: number;
  total_paid_amount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
