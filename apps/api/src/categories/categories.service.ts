import { Injectable, NotFoundException } from '@nestjs/common';
import { FulfillmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const optionInclude = {
  optionGroups: {
    include: {
      optionGroup: {
        include: {
          values: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' as const },
          },
        },
      },
    },
  },
};

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly TTL_MS = 120_000; // 2 minutes in-memory cache

  clearCache() {
    this.cache.clear();
  }

  async list(opts: { fulfillment?: FulfillmentType; activeOnly?: boolean }) {
    const key = `list:${JSON.stringify(opts)}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as Awaited<ReturnType<typeof this.prisma.category.findMany>>;
    }

    const data = await this.prisma.category.findMany({
      where: {
        ...(opts.activeOnly !== false ? { isActive: true } : {}),
        ...(opts.fulfillment ? { fulfillmentType: opts.fulfillment } : {}),
        parentId: null,
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        children: {
          where: opts.activeOnly !== false ? { isActive: true } : undefined,
          orderBy: { displayOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });

    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
    return data;
  }

  async bySlug(slug: string) {
    const key = `slug:${slug}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as any;
    }

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
        products: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        ...optionInclude,
      },
    });
    if (!category || !category.isActive) throw new NotFoundException('Category not found');
    const result = {
      ...category,
      optionGroups: category.optionGroups.map((l) => l.optionGroup),
    };
    this.cache.set(key, { data: result, expiresAt: Date.now() + this.TTL_MS });
    return result;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    fulfillmentType: FulfillmentType;
    displayOrder?: number;
    isActive?: boolean;
    parentId?: string | null;
    optionGroupIds?: string[];
  }) {
    this.clearCache();
    const { optionGroupIds, ...rest } = data;
    return this.prisma.category.create({
      data: {
        ...rest,
        optionGroups: optionGroupIds?.length
          ? { create: optionGroupIds.map((optionGroupId) => ({ optionGroupId })) }
          : undefined,
      },
      include: { optionGroups: { include: { optionGroup: true } } },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      image: string;
      fulfillmentType: FulfillmentType;
      displayOrder: number;
      isActive: boolean;
      parentId: string | null;
      optionGroupIds: string[];
    }>,
  ) {
    this.clearCache();
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    const { optionGroupIds, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (optionGroupIds) {
        await tx.categoryOptionGroup.deleteMany({ where: { categoryId: id } });
        if (optionGroupIds.length) {
          await tx.categoryOptionGroup.createMany({
            data: optionGroupIds.map((optionGroupId) => ({ categoryId: id, optionGroupId })),
          });
        }
      }
      return tx.category.update({
        where: { id },
        data: rest as Prisma.CategoryUpdateInput,
        include: { optionGroups: { include: { optionGroup: true } } },
      });
    });
  }

  async remove(id: string) {
    this.clearCache();
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async reorder(items: { id: string; displayOrder: number }[]) {
    this.clearCache();
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return { ok: true };
  }
}
