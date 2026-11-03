import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('store-status')
  getStoreStatus() {
    return this.settings.getStoreStatus();
  }

  @Put('store-status')
  @UseGuards(AdminAuthGuard)
  updateStoreStatus(@Body() body: { isOpen: boolean; notice?: string }) {
    return this.settings.setStoreStatus(body.isOpen, body.notice);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  getAll() {
    return this.settings.getAll();
  }

  @Put()
  @UseGuards(AdminAuthGuard)
  update(@Body() body: Record<string, string>) {
    return this.settings.setMany(body);
  }
}

