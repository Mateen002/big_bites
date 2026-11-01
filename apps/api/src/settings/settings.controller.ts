import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(AdminAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Put()
  update(@Body() body: Record<string, string>) {
    return this.settings.setMany(body);
  }
}
