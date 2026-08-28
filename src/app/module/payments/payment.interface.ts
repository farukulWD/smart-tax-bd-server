import { Schema } from 'mongoose';

export interface IPayment {
  _id: string;
  userId: Schema.Types.ObjectId;
  orderId: Schema.Types.ObjectId;
  amount: number;
  paymentFor:
    | 'fee_amount'
    | 'fee_due_amount'
    | 'tax_payable_amount'
    | 'remaining_all_amount';
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_id?: string;
  payment_method?: string;
  createdAt?: Date;
  updatedAt?: Date;
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

export interface IPaymentDataForInit {
  orderId: string;
  userId: string;
  paymentFor: IPayment['paymentFor'];
}
