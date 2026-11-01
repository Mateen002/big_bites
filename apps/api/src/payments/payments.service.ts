import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentAdapter, PaymentInitiateInput } from './adapters/payment-adapter';
import { CodAdapter } from './adapters/cod.adapter';
import { JazzCashSandboxAdapter } from './adapters/jazzcash.adapter';
import { EasypaisaSandboxAdapter } from './adapters/easypaisa.adapter';
import { StripeStubAdapter } from './adapters/stripe.adapter';

@Injectable()
export class PaymentsService {
  private adapters = new Map<PaymentMethod, PaymentAdapter>();

  constructor(private prisma: PrismaService) {
    this.adapters.set(PaymentMethod.COD, new CodAdapter());
    this.adapters.set(PaymentMethod.JAZZCASH, new JazzCashSandboxAdapter());
    this.adapters.set(PaymentMethod.EASYPAISA, new EasypaisaSandboxAdapter());
    this.adapters.set(PaymentMethod.STRIPE, new StripeStubAdapter());
  }

  initiate(input: PaymentInitiateInput) {
    if (input.method !== PaymentMethod.COD) {
      throw new BadRequestException(
        'Online payments are temporarily disabled. Please choose Cash on Delivery (COD).',
      );
    }
    const adapter = this.adapters.get(input.method);
    if (!adapter) throw new BadRequestException('Unsupported payment method');
    return adapter.initiate(input);
  }

  async completeSandbox(reference: string) {
    throw new BadRequestException(
      'Online payment gateway simulation is disabled. BigBites currently accepts Cash on Delivery (COD).',
    );
  }
}
