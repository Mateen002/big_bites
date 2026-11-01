import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly TTL_MS = 120_000;

  clearCache() {
    this.cache.clear();
  }

  async list(activeOnly: boolean) {
    const key = `zones:${activeOnly}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as Awaited<ReturnType<typeof this.prisma.deliveryZone.findMany>>;
    }
    const data = await this.prisma.deliveryZone.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
    });
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
    return data;
  }

  async create(data: {
    name: string;
    slug: string;
    feePkr: number;
    etaMinutesMin?: number;
    etaMinutesMax?: number;
    isActive?: boolean;
    displayOrder?: number;
  }) {
    this.clearCache();
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
      this.clearCache();
      return await this.prisma.deliveryZone.update({ where: { id }, data });
    } catch {
      throw new NotFoundException();
    }
  }

  async remove(id: string) {
    this.clearCache();
    await this.prisma.deliveryZone.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async reorder(items: { id: string; displayOrder: number }[]) {
    this.clearCache();
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
