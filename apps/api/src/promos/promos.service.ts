import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromosService {
  constructor(private prisma: PrismaService) {}

  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly TTL_MS = 120_000;

  clearCache() {
    this.cache.clear();
  }

  async list() {
    const key = 'list';
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as Awaited<ReturnType<typeof this.prisma.promo.findMany>>;
    }
    const data = await this.prisma.promo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
    return data;
  }

  async validate(code: string, subtotal: number) {
    const key = `validate:${code.toUpperCase()}`;
    let promo: any;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      promo = hit.data;
    } else {
      promo = await this.prisma.promo.findFirst({
        where: { code: code.toUpperCase(), isActive: true },
      });
      if (promo) {
        this.cache.set(key, { data: promo, expiresAt: Date.now() + 60_000 });
      }
    }
    if (!promo) throw new BadRequestException('Invalid promo code');
    const now = new Date();
    if (promo.startsAt && new Date(promo.startsAt) > now) throw new BadRequestException('Promo not active yet');
    if (promo.endsAt && new Date(promo.endsAt) < now) throw new BadRequestException('Promo expired');
    if (subtotal < promo.minOrderPkr) {
      throw new BadRequestException(`Minimum order Rs ${promo.minOrderPkr}`);
    }
    const discountPkr =
      promo.discountType === DiscountType.PERCENT
        ? Math.floor((subtotal * promo.discountValue) / 100)
        : Math.min(promo.discountValue, subtotal);
    return { promo, discountPkr };
  }

  async create(data: {
    code: string;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderPkr?: number;
    categoryId?: string | null;
    productId?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive?: boolean;
  }) {
    this.clearCache();
    return this.prisma.promo.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderPkr: data.minOrderPkr ?? 0,
        categoryId: data.categoryId,
        productId: data.productId,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      discountType: DiscountType;
      discountValue: number;
      minOrderPkr: number;
      categoryId: string | null;
      productId: string | null;
      startsAt: string | null;
      endsAt: string | null;
      isActive: boolean;
    }>,
  ) {
    try {
      this.clearCache();
      return await this.prisma.promo.update({
        where: { id },
        data: {
          ...data,
          code: data.code ? data.code.toUpperCase() : undefined,
          startsAt: data.startsAt === undefined ? undefined : data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
        },
      });
    } catch {
      throw new NotFoundException();
    }
  }

  async remove(id: string, force = false) {
    this.clearCache();
    if (force) {
      const orderCount = await this.prisma.order.count({ where: { promoId: id } });
      if (orderCount > 0) {
        await this.prisma.promo.update({ where: { id }, data: { isActive: false } });
        return {
          ok: true,
          softDeleted: true,
          message: `Promo is linked to ${orderCount} order(s); disabled instead of permanently deleted to preserve records.`,
        };
      }
      await this.prisma.promo.delete({ where: { id } });
      return { ok: true, message: 'Promo permanently deleted' };
    }
    await this.prisma.promo.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }
}
