import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        service: 'bigbites-api',
        database: 'connected',
        city: 'Lahore',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw new ServiceUnavailableException({
        ok: false,
        service: 'bigbites-api',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Database connectivity check failed',
      });
    }
  }
}
