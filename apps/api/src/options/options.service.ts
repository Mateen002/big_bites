import { Injectable, NotFoundException } from '@nestjs/common';
import { OptionSelectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OptionsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.optionGroup.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        values: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { categories: true, products: true } },
      },
    });
  }

  async byId(id: string) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id },
      include: { values: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!group) throw new NotFoundException();
    return group;
  }

  create(data: {
    name: string;
    slug: string;
    selectType: OptionSelectType;
    required?: boolean;
    minSelect?: number;
    maxSelect?: number | null;
    displayOrder?: number;
    values: {
      label: string;
      priceDeltaPkr?: number;
      displayOrder?: number;
      isActive?: boolean;
    }[];
  }) {
    return this.prisma.optionGroup.create({
      data: {
        name: data.name,
        slug: data.slug,
        selectType: data.selectType,
        required: data.required ?? false,
        minSelect: data.minSelect ?? 0,
        maxSelect: data.maxSelect,
        displayOrder: data.displayOrder ?? 0,
        values: {
          create: data.values.map((v, i) => ({
            label: v.label,
            priceDeltaPkr: v.priceDeltaPkr ?? 0,
            displayOrder: v.displayOrder ?? i,
            isActive: v.isActive ?? true,
          })),
        },
      },
      include: { values: true },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      selectType: OptionSelectType;
      required: boolean;
      minSelect: number;
      maxSelect: number | null;
      displayOrder: number;
      values: {
        id?: string;
        label: string;
        priceDeltaPkr?: number;
        displayOrder?: number;
        isActive?: boolean;
      }[];
    }>,
  ) {
    const existing = await this.prisma.optionGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    const { values, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (values) {
        await tx.optionValue.deleteMany({ where: { optionGroupId: id } });
        await tx.optionValue.createMany({
          data: values.map((v, i) => ({
            optionGroupId: id,
            label: v.label,
            priceDeltaPkr: v.priceDeltaPkr ?? 0,
            displayOrder: v.displayOrder ?? i,
            isActive: v.isActive ?? true,
          })),
        });
      }
      return tx.optionGroup.update({
        where: { id },
        data: rest,
        include: { values: { orderBy: { displayOrder: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    await this.prisma.optionGroup.delete({ where: { id } });
    return { ok: true };
  }
}
