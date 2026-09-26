import { PaymentMethod, PaymentStatus } from '@prisma/client';

export type PaymentInitiateInput = {
  orderId: string;
  orderNumber: string;
  amountPkr: number;
  method: PaymentMethod;
  customerPhone: string;
};

export type PaymentResult = {
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  redirectUrl?: string;
  message: string;
  sandbox: boolean;
};

export interface PaymentAdapter {
  method: PaymentMethod;
  initiate(input: PaymentInitiateInput): Promise<PaymentResult>;
  verify(reference: string): Promise<PaymentResult>;
}
