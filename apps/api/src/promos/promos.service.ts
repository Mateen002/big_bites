import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromosService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.promo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async validate(code: string, subtotal: number) {
    const promo = await this.prisma.promo.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
    });
    if (!promo) throw new BadRequestException('Invalid promo code');
    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) throw new BadRequestException('Promo not active yet');
    if (promo.endsAt && promo.endsAt < now) throw new BadRequestException('Promo expired');
    if (subtotal < promo.minOrderPkr) {
      throw new BadRequestException(`Minimum order Rs ${promo.minOrderPkr}`);
    }
    const discountPkr =
      promo.discountType === DiscountType.PERCENT
        ? Math.floor((subtotal * promo.discountValue) / 100)
        : Math.min(promo.discountValue, subtotal);
    return { promo, discountPkr };
  }

  create(data: {
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

  async remove(id: string) {
    await this.prisma.promo.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }
}
