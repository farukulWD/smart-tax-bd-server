import { z } from 'zod';

const recordCashPayment = z.object({
  body: z.object({
    orderId: z.string({ required_error: 'Order ID is required' }),
    paymentFor: z.enum(
      [
        'fee_amount',
        'fee_due_amount',
        'tax_payable_amount',
        'remaining_all_amount',
      ],
      { required_error: 'Payment for is required' },
    ),
  }),
});

export const PaymentValidation = {
  recordCashPayment,
};
