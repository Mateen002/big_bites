import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentAdapter, PaymentInitiateInput, PaymentResult } from './payment-adapter';

export class CodAdapter implements PaymentAdapter {
  method = PaymentMethod.COD;

  async initiate(input: PaymentInitiateInput): Promise<PaymentResult> {
    return {
      method: PaymentMethod.COD,
      status: PaymentStatus.PENDING,
      reference: `COD-${input.orderNumber}`,
      message: 'Pay cash on delivery. Keep exact change if possible.',
      sandbox: false,
    };
  }

  async verify(reference: string): Promise<PaymentResult> {
    return {
      method: PaymentMethod.COD,
      status: PaymentStatus.PENDING,
      reference,
      message: 'COD orders are collected on delivery.',
      sandbox: false,
    };
  }
}
