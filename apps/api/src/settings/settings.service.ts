import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private memoryCache = new Map<string, string>();
  private lastFetched = 0;

  async getAll(): Promise<Record<string, string>> {
    if (Date.now() - this.lastFetched < 15_000 && this.memoryCache.size > 0) {
      return Object.fromEntries(this.memoryCache);
    }
    const list = await this.prisma.systemSetting.findMany();
    this.memoryCache.clear();
    for (const item of list) {
      this.memoryCache.set(item.key, item.value);
    }
    this.lastFetched = Date.now();
    return Object.fromEntries(this.memoryCache);
  }

  async get(key: string, defaultValue = ''): Promise<string> {
    const all = await this.getAll();
    return all[key] ?? defaultValue;
  }

  async setMany(data: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        await this.prisma.systemSetting.upsert({
          where: { key },
          update: { value: value.trim() },
          create: { key, value: value.trim() },
        });
        this.memoryCache.set(key, value.trim());
      }
    }
    this.lastFetched = Date.now();
    return this.getAll();
  }

  async isStoreOpen(): Promise<boolean> {
    const val = await this.get('isStoreOpen', 'true');
    return val !== 'false';
  }

  async getStoreStatus(): Promise<{ isOpen: boolean; notice: string }> {
    const all = await this.getAll();
    const isOpen = all['isStoreOpen'] !== 'false';
    const notice =
      all['storeClosedNotice'] ||
      'BigBites is currently closed for orders. Feel free to explore our menu!';
    return { isOpen, notice };
  }

  async setStoreStatus(
    isOpen: boolean,
    notice?: string,
  ): Promise<{ isOpen: boolean; notice: string }> {
    const updates: Record<string, string> = {
      isStoreOpen: isOpen ? 'true' : 'false',
    };
    if (notice !== undefined) {
      updates['storeClosedNotice'] = notice.trim();
    }
    await this.setMany(updates);
    return this.getStoreStatus();
  }
}

