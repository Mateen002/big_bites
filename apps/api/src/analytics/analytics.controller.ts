import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

class RangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number;
}

@Controller('analytics')
@UseGuards(AdminAuthGuard)
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  overview(@Query() query: RangeDto) {
    return this.analytics.overview(query.days ?? 30);
  }
}
