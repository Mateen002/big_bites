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
    const adapter = this.adapters.get(input.method);
    if (!adapter) throw new BadRequestException('Unsupported payment method');
    return adapter.initiate(input);
  }

  async completeSandbox(reference: string) {
    const order = await this.prisma.order.findFirst({
      where: { paymentRef: reference },
    });
    if (!order) throw new BadRequestException('Unknown payment reference');

    const adapter = this.adapters.get(order.paymentMethod);
    if (!adapter) throw new BadRequestException('Unsupported payment method');
    const result = await adapter.verify(reference);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
      },
    });

    return {
      ...result,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }
}
