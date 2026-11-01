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

  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly TTL_MS = 10_000;

  clearCache() {
    this.cache.clear();
  }

  private orderNumber() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BB-${stamp}-${rand}`;
  }

  private maskName(name: string): string {
    if (!name) return 'Customer';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : parts[0];
    }
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  private maskPhone(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 7) return '••••••';
    const start = clean.slice(0, 4);
    const end = clean.slice(-3);
    return `${start} •••• ${end}`;
  }

  private maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const [user, domain] = email.split('@');
    if (!domain) return '••••@••••';
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  }

  private maskAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      return `•••• ${parts.slice(-2).join(', ')}`;
    }
    return `•••• ${address.slice(-15)}`;
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
      orderType?: 'DELIVERY' | 'PICKUP';
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
    const isPickup = input.orderType === 'PICKUP';
    const deliveryFeePkr = isPickup ? 0 : zone.feePkr;
    const totalPkr = Math.max(0, subtotalPkr + deliveryFeePkr - discountPkr);
    const generatedOrderNumber = this.orderNumber();

    const payment = await this.payments.initiate({
      orderId: 'pending',
      orderNumber: generatedOrderNumber,
      amountPkr: totalPkr,
      method: input.paymentMethod,
      customerPhone: input.customerPhone,
    });

    const order = await this.prisma.order.create({
      data: {
        orderNumber: generatedOrderNumber,
        status:
          payment.status === PaymentStatus.PAID || input.paymentMethod === PaymentMethod.COD
            ? OrderStatus.CONFIRMED
            : OrderStatus.PENDING,
        customerId: customerId || null,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        addressLine: input.addressLine,
        deliveryZoneId: zone.id,
        paymentMethod: input.paymentMethod,
        paymentStatus: payment.status,
        paymentRef: payment.reference,
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

    await this.cart.clear(sessionId);
    this.clearCache();
    return { ...order, payment };
  }

  async tracking(idOrNumber: string, user?: { userId: string; role: string } | null) {
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

    const isAuthorized =
      user &&
      (user.role === 'admin' ||
        (user.role === 'customer' && order.customerId === user.userId));

    if (isAuthorized) {
      return order;
    }

    // Public guest tracking view with PII safely masked:
    return {
      ...order,
      customerName: this.maskName(order.customerName),
      customerPhone: this.maskPhone(order.customerPhone),
      customerEmail: this.maskEmail(order.customerEmail),
      addressLine: this.maskAddress(order.addressLine),
      notes: undefined,
    };
  }

  get(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: true, deliveryZone: true, promo: true },
    });
  }

  async list(status?: OrderStatus) {
    const key = `list:${status || 'ALL'}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as Awaited<ReturnType<typeof this.prisma.order.findMany>>;
    }
    const data = await this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        deliveryZone: true,
      },
      take: 100,
    });
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
    return data;
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
    this.clearCache();
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, deliveryZone: true },
    });
  }
}
