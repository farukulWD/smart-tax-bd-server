import { Document, Types } from 'mongoose';

export interface IIncomeSourceTitle {
  en: string;
  bn: string;
}

export interface IIncomeSource extends Document {
  /**
   * Stable key, e.g. 'Income from Govt.Job'. `Tax.source_of_income` stores these
   * strings and the mobile app submits them, so renaming one detaches every
   * order that already declared it. Treat it as a key and use `title` for
   * display copy.
   */
  value: string;
  title: IIncomeSourceTitle;
  /** File names (documents) required when an order declares this source. */
  required_files: Types.ObjectId[];
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
