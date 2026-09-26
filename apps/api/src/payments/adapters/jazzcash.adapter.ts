import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentAdapter, PaymentInitiateInput, PaymentResult } from './payment-adapter';

export class JazzCashSandboxAdapter implements PaymentAdapter {
  method = PaymentMethod.JAZZCASH;

  async initiate(input: PaymentInitiateInput): Promise<PaymentResult> {
    const reference = `JC-SANDBOX-${input.orderNumber}-${Date.now()}`;
    const baseUrl = process.env.API_URL || 'http://localhost:4000';
    return {
      method: PaymentMethod.JAZZCASH,
      status: PaymentStatus.INITIATED,
      reference,
      redirectUrl: `${baseUrl}/api/v1/payments/sandbox/complete?ref=${reference}&provider=jazzcash`,
      message:
        'JazzCash sandbox: simulation only. Merchant credentials not configured. Click redirect URL to mark paid.',
      sandbox: true,
    };
  }

  async verify(reference: string): Promise<PaymentResult> {
    return {
      method: PaymentMethod.JAZZCASH,
      status: PaymentStatus.PAID,
      reference,
      message: 'JazzCash sandbox payment verified.',
      sandbox: true,
    };
  }
}
