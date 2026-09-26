import { Injectable, NotFoundException } from '@nestjs/common';
import { FulfillmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  list(opts: { categorySlug?: string; fulfillment?: string; activeOnly?: boolean; search?: string }) {
    const searchFilter = opts.search?.trim()
      ? {
          OR: [
            { name: { contains: opts.search.trim() } },
            { description: { contains: opts.search.trim() } },
          ],
        }
      : {};

    return this.prisma.product.findMany({
      where: {
        ...(opts.activeOnly !== false ? { isActive: true } : {}),
        ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
        ...(opts.fulfillment
          ? { category: { fulfillmentType: opts.fulfillment as FulfillmentType } }
          : {}),
        ...searchFilter,
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            fulfillmentType: true,
          },
        },
      },
    });
  }

  async bySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            optionGroups: {
              include: {
                optionGroup: {
                  include: {
                    values: {
                      where: { isActive: true },
                      orderBy: { displayOrder: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
        optionGroups: {
          include: {
            optionGroup: {
              include: {
                values: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    if (!product || !product.isActive) throw new NotFoundException('Product not found');

    const byId = new Map<string, (typeof product.optionGroups)[0]['optionGroup']>();
    for (const link of product.category.optionGroups) {
      byId.set(link.optionGroup.id, link.optionGroup);
    }
    for (const link of product.optionGroups) {
      byId.set(link.optionGroup.id, link.optionGroup);
    }

    const optionGroups = [...byId.values()].sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      ...product,
      optionGroups,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        fulfillmentType: product.category.fulfillmentType,
      },
    };
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    pricePkr: number;
    costPkr?: number | null;
    compareAtPkr?: number | null;
    categoryId: string;
    displayOrder?: number;
    isActive?: boolean;
    packSize?: string | null;
    weightGrams?: number | null;
    piecesPerPack?: number | null;
    optionGroupIds?: string[];
  }) {
    const { optionGroupIds, ...rest } = data;
    return this.prisma.product.create({
      data: {
        ...rest,
        optionGroups: optionGroupIds?.length
          ? { create: optionGroupIds.map((optionGroupId) => ({ optionGroupId })) }
          : undefined,
      },
      include: { category: true },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      image: string;
      pricePkr: number;
      costPkr: number | null;
      compareAtPkr: number | null;
      categoryId: string;
      displayOrder: number;
      isActive: boolean;
      packSize: string | null;
      weightGrams: number | null;
      piecesPerPack: number | null;
      optionGroupIds: string[];
    }>,
  ) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    const { optionGroupIds, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (optionGroupIds) {
        await tx.productOptionGroup.deleteMany({ where: { productId: id } });
        if (optionGroupIds.length) {
          await tx.productOptionGroup.createMany({
            data: optionGroupIds.map((optionGroupId) => ({ productId: id, optionGroupId })),
          });
        }
      }
      return tx.product.update({
        where: { id },
        data: rest as Prisma.ProductUpdateInput,
        include: { category: true },
      });
    });
  }

  async remove(id: string) {
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  async reorder(items: { id: string; displayOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.product.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return { ok: true };
  }
}
