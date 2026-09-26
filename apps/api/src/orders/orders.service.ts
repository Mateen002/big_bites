import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private payments: PaymentsService,
  ) {}

  private orderNumber() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BB-${stamp}-${rand}`;
  }

  async checkout(
    sessionId: string | undefined,
    input: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      addressLine: string;
      deliveryZoneId: string;
      paymentMethod: PaymentMethod;
      promoCode?: string;
      scheduledFor?: string;
      notes?: string;
    },
    customerId?: string,
  ) {
    if (!sessionId) throw new BadRequestException('Missing cart session');
    const cart = await this.cart.getCart(sessionId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const zone = await this.prisma.deliveryZone.findFirst({
      where: { id: input.deliveryZoneId, isActive: true },
    });
    if (!zone) throw new BadRequestException('Invalid delivery zone');

    let discountPkr = 0;
    let promoId: string | undefined;
    if (input.promoCode) {
      const promo = await this.prisma.promo.findFirst({
        where: { code: input.promoCode.toUpperCase(), isActive: true },
      });
      if (!promo) throw new BadRequestException('Invalid promo code');
      const now = new Date();
      if (promo.startsAt && promo.startsAt > now) throw new BadRequestException('Promo not active yet');
      if (promo.endsAt && promo.endsAt < now) throw new BadRequestException('Promo expired');
      if (cart.subtotalPkr < promo.minOrderPkr) {
        throw new BadRequestException(`Minimum order Rs ${promo.minOrderPkr} for this promo`);
      }

      let eligibleSubtotal = cart.subtotalPkr;
      if (promo.productId) {
        eligibleSubtotal = cart.items
          .filter((i) => i.productId === promo.productId)
          .reduce((s, i) => s + i.lineTotalPkr, 0);
      } else if (promo.categoryId) {
        const products = await this.prisma.product.findMany({
          where: { categoryId: promo.categoryId },
          select: { id: true },
        });
        const ids = new Set(products.map((p) => p.id));
        eligibleSubtotal = cart.items
          .filter((i) => ids.has(i.productId))
          .reduce((s, i) => s + i.lineTotalPkr, 0);
      }

      discountPkr =
        promo.discountType === DiscountType.PERCENT
          ? Math.floor((eligibleSubtotal * promo.discountValue) / 100)
          : Math.min(promo.discountValue, eligibleSubtotal);
      promoId = promo.id;
    }

    const hasScheduled = cart.items.some((i) => i.fulfillmentType === FulfillmentType.SCHEDULED);
    const hasHot = cart.items.some((i) => i.fulfillmentType === FulfillmentType.HOT_NOW);
    if (hasScheduled && !hasHot && !input.scheduledFor) {
      // default next-day morning window
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      input.scheduledFor = tomorrow.toISOString();
    }

    const subtotalPkr = cart.subtotalPkr;
    const deliveryFeePkr = zone.feePkr;
    const totalPkr = Math.max(0, subtotalPkr + deliveryFeePkr - discountPkr);

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.orderNumber(),
        status: OrderStatus.PENDING,
        customerId: customerId || null,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        addressLine: input.addressLine,
        deliveryZoneId: zone.id,
        paymentMethod: input.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        subtotalPkr,
        deliveryFeePkr,
        discountPkr,
        totalPkr,
        promoId,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        notes: input.notes,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            fulfillmentType: item.fulfillmentType,
            unitPricePkr: item.unitPricePkr,
            quantity: item.quantity,
            lineTotalPkr: item.lineTotalPkr,
            selectionsJson: item.selections,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
        deliveryZone: true,
        promo: true,
      },
    });

    const payment = await this.payments.initiate({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountPkr: totalPkr,
      method: input.paymentMethod,
      customerPhone: input.customerPhone,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: payment.status,
        paymentRef: payment.reference,
        status:
          payment.status === PaymentStatus.PAID || input.paymentMethod === PaymentMethod.COD
            ? OrderStatus.CONFIRMED
            : OrderStatus.PENDING,
      },
    });

    await this.cart.clear(sessionId);

    const fresh = await this.get(order.id);
    return { ...fresh, payment };
  }

  async tracking(idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        items: true,
        deliveryZone: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  get(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: true, deliveryZone: true, promo: true },
    });
  }

  list(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        deliveryZone: true,
      },
      take: 100,
    });
  }

  listForCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        deliveryZone: true,
      },
      take: 50,
    });
  }

  async getForCustomer(customerId: string, idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        customerId,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        items: true,
        deliveryZone: true,
        promo: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, deliveryZone: true },
    });
  }
}
