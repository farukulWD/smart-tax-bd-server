import { Schema } from 'mongoose';

export interface IPayment {
  id: string;
  userId: Schema.Types.ObjectId;
  orderId: Schema.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
  payment_method?: string;
}

export interface IPaymentDataForDb {
  userId: Schema.Types.ObjectId;
  orderId: Schema.Types.ObjectId;
  amount?: number;
  currency?: string;
  status?: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
  payment_method?: string;
}
