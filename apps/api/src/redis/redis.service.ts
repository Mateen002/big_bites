import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memory = new Map<string, { value: string; expiresAt?: number }>();
  private useMemory = false;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      });
      this.client.on('error', () => {
        /* handled on connect */
      });
    } catch {
      this.useMemory = true;
      this.logger.warn('Redis unavailable - using in-memory cart store');
    }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => undefined);
  }

  private async ensureClient(): Promise<boolean> {
    if (this.useMemory || !this.client) return false;
    try {
      if (this.client.status !== 'ready') {
        await this.client.connect();
      }
      await this.client.ping();
      return true;
    } catch {
      this.useMemory = true;
      this.logger.warn('Redis connection failed - falling back to in-memory store');
      return false;
    }
  }

  private purgeExpired(key: string) {
    const entry = this.memory.get(key);
    if (entry?.expiresAt && entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry;
  }

  async get(key: string): Promise<string | null> {
    if (await this.ensureClient()) {
      return this.client!.get(key);
    }
    const entry = this.purgeExpired(key);
    return entry?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (await this.ensureClient()) {
      if (ttlSeconds) await this.client!.set(key, value, 'EX', ttlSeconds);
      else await this.client!.set(key, value);
      return;
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (await this.ensureClient()) {
      await this.client!.del(key);
      return;
    }
    this.memory.delete(key);
  }
}
