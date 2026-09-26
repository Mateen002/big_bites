import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentAdapter, PaymentInitiateInput, PaymentResult } from './payment-adapter';

/** Stripe stub — ready for live keys later. */
export class StripeStubAdapter implements PaymentAdapter {
  method = PaymentMethod.STRIPE;

  async initiate(input: PaymentInitiateInput): Promise<PaymentResult> {
    const hasKey = Boolean(process.env.STRIPE_SECRET_KEY);
    const reference = `ST-STUB-${input.orderNumber}-${Date.now()}`;
    return {
      method: PaymentMethod.STRIPE,
      status: hasKey ? PaymentStatus.INITIATED : PaymentStatus.INITIATED,
      reference,
      redirectUrl: `http://localhost:4000/api/v1/payments/sandbox/complete?ref=${reference}&provider=stripe`,
      message: hasKey
        ? 'Stripe stub with key present — replace with Checkout Session creation.'
        : 'Stripe stub: no STRIPE_SECRET_KEY. Simulated checkout URL provided.',
      sandbox: true,
    };
  }

  async verify(reference: string): Promise<PaymentResult> {
    return {
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.PAID,
      reference,
      message: 'Stripe stub payment marked paid.',
      sandbox: true,
    };
  }
}
