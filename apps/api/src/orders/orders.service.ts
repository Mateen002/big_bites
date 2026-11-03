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
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private payments: PaymentsService,
    private settings: SettingsService,
  ) {}

  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private zoneCache = new Map<string, { data: any; expiresAt: number }>();
  private trackingCache = new Map<string, { data: any; expiresAt: number }>();
  private promoCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly TTL_MS = 10_000;

  clearCache() {
    this.cache.clear();
    this.trackingCache.clear();
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

    let zone: any;
    const cachedZone = this.zoneCache.get(input.deliveryZoneId);
    if (cachedZone && cachedZone.expiresAt > Date.now()) {
      zone = cachedZone.data;
    } else {
      zone = await this.prisma.deliveryZone.findFirst({
        where: { id: input.deliveryZoneId, isActive: true },
      });
      if (zone) {
        this.zoneCache.set(input.deliveryZoneId, { data: zone, expiresAt: Date.now() + 120_000 });
      }
    }
    if (!zone) throw new BadRequestException('Invalid delivery zone');

    let discountPkr = 0;
    let promoId: string | undefined;
    if (input.promoCode) {
      const promoKey = input.promoCode.toUpperCase();
      let promo: any;
      const cachedPromo = this.promoCache.get(promoKey);
      if (cachedPromo && cachedPromo.expiresAt > Date.now()) {
        promo = cachedPromo.data;
      } else {
        promo = await this.prisma.promo.findFirst({
          where: { code: promoKey, isActive: true },
        });
        if (promo) {
          this.promoCache.set(promoKey, { data: promo, expiresAt: Date.now() + 60_000 });
        }
      }
      if (!promo) throw new BadRequestException('Invalid promo code');
      const now = new Date();
      if (promo.startsAt && new Date(promo.startsAt) > now) throw new BadRequestException('Promo not active yet');
      if (promo.endsAt && new Date(promo.endsAt) < now) throw new BadRequestException('Promo expired');
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
    this.trackingCache.set(order.id, { data: order, expiresAt: Date.now() + 30_000 });
    this.trackingCache.set(order.orderNumber, { data: order, expiresAt: Date.now() + 30_000 });

    // Tier 2: Fire-and-forget instant mobile dispatch alerts (Telegram & WhatsApp)
    this.sendTelegramAlert(order).catch((err) => {
      console.warn('Telegram notification error:', err);
    });

    this.sendWhatsAppAlert(order).catch((err) => {
      console.warn('WhatsApp automated alert error:', err);
    });

    return { ...order, payment };
  }

  async tracking(idOrNumber: string, user?: { userId: string; role: string } | null) {
    let order: any;
    const hit = this.trackingCache.get(idOrNumber);
    if (hit && hit.expiresAt > Date.now()) {
      order = hit.data;
    } else {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
        },
        include: {
          items: true,
          deliveryZone: true,
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      this.trackingCache.set(order.id, { data: order, expiresAt: Date.now() + 15_000 });
      this.trackingCache.set(order.orderNumber, { data: order, expiresAt: Date.now() + 15_000 });
    }

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

  // --- Tier 2: Mobile Order Notifications (Telegram Bot) ---

  async sendTestTelegramAlert() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      throw new BadRequestException('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured in .env');
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ *BigBites Lahore: Telegram Notifications Active!*\nYour bot is successfully connected. You will receive live customer order alerts here with sound.`,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(`Telegram API error: ${errBody}`);
    }
    return { ok: true, message: 'Test message sent to your Telegram chat!' };
  }

  private async sendTelegramAlert(order: any) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    try {
      const itemsList =
        order.items
          ?.map((i: any) => `• *${i.quantity}×* ${i.productName}`)
          .join('\n') || '-';

      const text = [
        `🔔 *NEW BIGBITES ORDER RECEIVED!*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📦 *Order:* \`#${order.orderNumber}\``,
        `👤 *Customer:* ${order.customerName}`,
        `📞 *Phone:* \`${order.customerPhone}\``,
        `📍 *Zone:* ${order.deliveryZone?.name ?? 'Lahore'}`,
        order.addressLine ? `🏠 *Address:* ${order.addressLine}` : '',
        `💰 *Total:* Rs ${Number(order.totalPkr).toLocaleString()} (${order.paymentMethod})`,
        ``,
        `📋 *Items:*`,
        itemsList,
        order.notes ? `\n📝 *Customer Note:* "${order.notes}"` : '',
        `━━━━━━━━━━━━━━━━━━━━`,
        `🕒 ${new Date(order.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`,
      ]
        .filter(Boolean)
        .join('\n');

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.warn('Telegram notification dispatch failed:', err);
    }
  }

  // --- Tier 2: WhatsApp Automated Delivery (Supports Multiple Phone Numbers) ---

  private cleanPhone(phone?: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('92')) return digits;
    if (digits.startsWith('0')) return `92${digits.slice(1)}`;
    if (digits.length === 10) return `92${digits}`;
    return digits;
  }

  private parseMultiplePhones(input?: string | null): string[] {
    if (!input) return [];
    try {
      const trimmed = input.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item : item?.phone))
            .map((p) => this.cleanPhone(p))
            .filter((p) => p.length >= 10);
        }
      }
    } catch {}
    return input
      .split(/[,;\n\/]+/)
      .map((s) => this.cleanPhone(s.trim()))
      .filter((s) => s.length >= 10);
  }

  private async getAllTargetPhones(): Promise<string[]> {
    const contactsJson = await this.settings.get('staff_contacts_json', '');
    const rawKitchen = await this.settings.get('kitchen_phone', process.env.KITCHEN_WHATSAPP_NUMBERS || '');
    const rawManager = await this.settings.get('manager_phone', '');

    const phoneSet = new Set<string>();
    for (const p of this.parseMultiplePhones(contactsJson)) phoneSet.add(p);
    for (const p of this.parseMultiplePhones(rawKitchen)) phoneSet.add(p);
    for (const p of this.parseMultiplePhones(rawManager)) phoneSet.add(p);

    return Array.from(phoneSet);
  }

  async sendTestWhatsAppAlert() {
    const phones = await this.getAllTargetPhones();
    if (!phones.length) {
      throw new BadRequestException('No WhatsApp phone numbers are configured in settings');
    }

    const ultraInstance = await this.settings.get('whatsapp_instance_id', process.env.WHATSAPP_INSTANCE_ID || '');
    const ultraToken = await this.settings.get('whatsapp_token', process.env.WHATSAPP_TOKEN || '');
    const metaToken = await this.settings.get('whatsapp_cloud_token', process.env.WHATSAPP_CLOUD_TOKEN || '');
    const metaPhoneId = await this.settings.get('whatsapp_phone_number_id', process.env.WHATSAPP_PHONE_NUMBER_ID || '');

    const hasGateway = (ultraInstance && ultraToken) || (metaToken && metaPhoneId);

    if (!hasGateway) {
      return {
        ok: false,
        requiresGateway: true,
        phones,
        message: `Saved ${phones.length} active phone number(s): ${phones.map((p) => `+${p}`).join(', ')}. To receive 100% automated background WhatsApp notifications when customers place an order, connect an UltraMsg or Meta API gateway below, or tap the green WhatsApp buttons on order cards!`,
      };
    }

    const testMsg = `✅ *BigBites Lahore: Automated WhatsApp Alert Test!*\nYour phone number is active. You will receive live customer order dispatch notifications here.`;
    const results: { phone: string; ok: boolean; error?: string }[] = [];

    for (const phone of phones) {
      try {
        if (ultraInstance && ultraToken) {
          const res = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: ultraToken,
              to: phone,
              body: testMsg,
            }),
          });
          results.push({ phone, ok: res.ok });
        } else if (metaToken && metaPhoneId) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${metaToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: testMsg },
            }),
          });
          results.push({ phone, ok: res.ok });
        }
      } catch (err: any) {
        results.push({ phone, ok: false, error: err.message });
      }
    }

    return {
      ok: true,
      message: `Test alert dispatched to ${phones.length} number(s)`,
      results,
    };
  }

  private async sendWhatsAppAlert(order: any) {
    const phones = await this.getAllTargetPhones();
    if (!phones.length) return;

    const ultraInstance = await this.settings.get('whatsapp_instance_id', process.env.WHATSAPP_INSTANCE_ID || '');
    const ultraToken = await this.settings.get('whatsapp_token', process.env.WHATSAPP_TOKEN || '');
    const metaToken = await this.settings.get('whatsapp_cloud_token', process.env.WHATSAPP_CLOUD_TOKEN || '');
    const metaPhoneId = await this.settings.get('whatsapp_phone_number_id', process.env.WHATSAPP_PHONE_NUMBER_ID || '');

    if (!((ultraInstance && ultraToken) || (metaToken && metaPhoneId))) return;

    const itemsList =
      order.items
        ?.map((i: any) => `• *${i.quantity}×* ${i.productName}`)
        .join('\n') || '-';

    const messageText = `🔔 *BIGBITES KITCHEN ORDER #${order.orderNumber}*
━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.customerPhone}
📍 *Zone:* ${order.deliveryZone?.name ?? 'Standard'}
${order.addressLine ? `🏠 *Address:* ${order.addressLine}\n` : ''}💰 *Total:* Rs ${Number(order.totalPkr).toLocaleString()} (${order.paymentMethod})

📋 *Items:*
${itemsList}
${order.notes ? `\n📝 *Notes:* "${order.notes}"\n` : ''}━━━━━━━━━━━━━━━━━━
🕒 ${new Date(order.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;

    for (const phone of phones) {
      try {
        if (ultraInstance && ultraToken) {
          await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: ultraToken,
              to: phone,
              body: messageText,
            }),
          });
        } else if (metaToken && metaPhoneId) {
          await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${metaToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: messageText },
            }),
          });
        }
      } catch (err) {
        console.warn(`Automated WhatsApp dispatch failed for ${phone}:`, err);
      }
    }
  }
}
