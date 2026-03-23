import { model, Schema } from 'mongoose';
import { IPayment } from './payment.interface';

const paymentSchema = new Schema<IPayment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Tax',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'BDT',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  paymentFor: {
    type: String,
    enum: [
      'fee_amount',
      'fee_due_amount',
      'tax_payable_amount',
      'remaining_all_amount',
    ],
    default: 'fee_amount',
  },
  transaction_id: {
    type: String,
  },
  payment_method: {
    type: String,
  },
});

export const Payment = model<IPayment>('Payment', paymentSchema);
