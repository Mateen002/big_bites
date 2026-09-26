import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  list(activeOnly: boolean) {
    return this.prisma.deliveryZone.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
    });
  }

  create(data: {
    name: string;
    slug: string;
    feePkr: number;
    etaMinutesMin?: number;
    etaMinutesMax?: number;
    isActive?: boolean;
    displayOrder?: number;
  }) {
    return this.prisma.deliveryZone.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      feePkr: number;
      etaMinutesMin: number;
      etaMinutesMax: number;
      isActive: boolean;
      displayOrder: number;
    }>,
  ) {
    try {
      return await this.prisma.deliveryZone.update({ where: { id }, data });
    } catch {
      throw new NotFoundException();
    }
  }

  async remove(id: string) {
    await this.prisma.deliveryZone.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async reorder(items: { id: string; displayOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.deliveryZone.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return { ok: true };
  }
}
