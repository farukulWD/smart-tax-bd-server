import { Schema } from 'mongoose';

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

// define the interface for tax
export interface ITax extends Document {
  id: string;
  userId: Schema.Types.ObjectId;
  is_self: boolean;
  for_other_person: boolean;
  personal_iformation: {
    name: string;
    email: string;
    phone: string;
    are_you_student: boolean;
    are_you_house_wife: boolean;
  };
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  are_you_get_notice_from_tax_office: boolean;
  income_from_partnership_firm: boolean;
  income_from_ldt_company: boolean;
  source_of_income: Array<IncomeSource>;
  tax_year: string;
  documents: string[];
  tax_payable_amount: number;
  tax_paid_amount: number;
  fee_amount: number;
  fee_due_amount: number;
  tax_paid_date: Date;
  created_at: Date;
  updated_at: Date;
}
