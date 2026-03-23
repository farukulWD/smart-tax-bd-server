import { IPayment } from '../payments/payment.interface';

export const getPaymentsType = (paymentFor: IPayment['paymentFor']) => {
  if (paymentFor === 'fee_amount') {
    return {
      is_fee_amount_paid: true,
    };
  }

  if (paymentFor === 'fee_due_amount') {
    return {
      is_fee_due_amount_paid: true,
    };
  }

  if (paymentFor === 'tax_payable_amount') {
    return {
      is_tax_payable_amount_paid: true,
    };
  }

  if (paymentFor === 'remaining_all_amount') {
    return {
      is_tax_payable_amount_paid: true,
      is_fee_amount_paid: true,
      is_fee_due_amount_paid: true,
    };
  }
};
