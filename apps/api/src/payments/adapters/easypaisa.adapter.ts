import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentAdapter, PaymentInitiateInput, PaymentResult } from './payment-adapter';

export class EasypaisaSandboxAdapter implements PaymentAdapter {
  method = PaymentMethod.EASYPAISA;

  async initiate(input: PaymentInitiateInput): Promise<PaymentResult> {
    const reference = `EP-SANDBOX-${input.orderNumber}-${Date.now()}`;
    return {
      method: PaymentMethod.EASYPAISA,
      status: PaymentStatus.INITIATED,
      reference,
      redirectUrl: `http://localhost:4000/api/v1/payments/sandbox/complete?ref=${reference}&provider=easypaisa`,
      message:
        'Easypaisa sandbox: simulation only. Store credentials not configured. Click redirect URL to mark paid.',
      sandbox: true,
    };
  }

  async verify(reference: string): Promise<PaymentResult> {
    return {
      method: PaymentMethod.EASYPAISA,
      status: PaymentStatus.PAID,
      reference,
      message: 'Easypaisa sandbox payment verified.',
      sandbox: true,
    };
  }
}
