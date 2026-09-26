import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FulfillmentType } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type CartSelection = {
  optionGroupId: string;
  optionGroupName: string;
  optionValueId: string;
  optionValueLabel: string;
  priceDeltaPkr: number;
  quantity: number;
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  image?: string | null;
  fulfillmentType: FulfillmentType;
  unitPricePkr: number;
  quantity: number;
  selections: CartSelection[];
  notes?: string;
  lineTotalPkr: number;
};

export type Cart = {
  sessionId: string;
  items: CartItem[];
  itemCount: number;
  subtotalPkr: number;
};

const CART_TTL = 60 * 60 * 24 * 7;

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private key(sessionId: string) {
    return `cart:${sessionId}`;
  }

  private summarize(sessionId: string, items: CartItem[]): Cart {
    const subtotalPkr = items.reduce((s, i) => s + i.lineTotalPkr, 0);
    const itemCount = items.reduce((s, i) => s + i.quantity, 0);
    return { sessionId, items, itemCount, subtotalPkr };
  }

  private async save(sessionId: string, items: CartItem[]) {
    await this.redis.set(this.key(sessionId), JSON.stringify(items), CART_TTL);
    return this.summarize(sessionId, items);
  }

  async getCart(sessionId: string): Promise<Cart> {
    const raw = await this.redis.get(this.key(sessionId));
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    return this.summarize(sessionId, items);
  }

  async addItem(
    sessionId: string,
    input: {
      productId: string;
      quantity?: number;
      selections?: {
        optionGroupId: string;
        optionValueId: string;
        quantity?: number;
      }[];
      notes?: string;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      include: {
        category: true,
        optionGroups: { include: { optionGroup: { include: { values: true } } } },
      },
    });
    if (!product || !product.isActive) throw new NotFoundException('Product not found');

    const categoryGroups = await this.prisma.categoryOptionGroup.findMany({
      where: { categoryId: product.categoryId },
      include: { optionGroup: { include: { values: true } } },
    });

    const groups = new Map(
      [
        ...categoryGroups.map((g) => g.optionGroup),
        ...product.optionGroups.map((g) => g.optionGroup),
      ].map((g) => [g.id, g]),
    );

    const selections: CartSelection[] = [];
    let optionsExtra = 0;

    for (const sel of input.selections || []) {
      const group = groups.get(sel.optionGroupId);
      if (!group) throw new BadRequestException('Invalid option group');
      const value = group.values.find((v) => v.id === sel.optionValueId && v.isActive);
      if (!value) throw new BadRequestException('Invalid option value');
      const qty = sel.quantity || 1;
      optionsExtra += value.priceDeltaPkr * qty;
      selections.push({
        optionGroupId: group.id,
        optionGroupName: group.name,
        optionValueId: value.id,
        optionValueLabel: value.label,
        priceDeltaPkr: value.priceDeltaPkr,
        quantity: qty,
      });
    }

    for (const group of groups.values()) {
      if (!group.required) continue;
      const count = selections.filter((s) => s.optionGroupId === group.id).length;
      if (count < (group.minSelect || 1)) {
        throw new BadRequestException(`${group.name} is required`);
      }
    }

    const quantity = input.quantity || 1;
    const unitPricePkr = product.pricePkr + optionsExtra;
    const item: CartItem = {
      id: uuid(),
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      image: product.image,
      fulfillmentType: product.category.fulfillmentType,
      unitPricePkr,
      quantity,
      selections,
      notes: input.notes,
      lineTotalPkr: unitPricePkr * quantity,
    };

    const cart = await this.getCart(sessionId);
    cart.items.push(item);
    return this.save(sessionId, cart.items);
  }

  async updateItem(sessionId: string, itemId: string, quantity: number) {
    const cart = await this.getCart(sessionId);
    const idx = cart.items.findIndex((i) => i.id === itemId);
    if (idx < 0) throw new NotFoundException('Cart item not found');
    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
      cart.items[idx].lineTotalPkr = cart.items[idx].unitPricePkr * quantity;
    }
    return this.save(sessionId, cart.items);
  }

  async removeItem(sessionId: string, itemId: string) {
    const cart = await this.getCart(sessionId);
    return this.save(
      sessionId,
      cart.items.filter((i) => i.id !== itemId),
    );
  }

  async clear(sessionId: string) {
    await this.redis.del(this.key(sessionId));
    return this.summarize(sessionId, []);
  }
}
