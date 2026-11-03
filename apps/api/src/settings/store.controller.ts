import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('store')
export class StoreController {
  constructor(private settings: SettingsService) {}

  @Get('status')
  getStatus() {
    return this.settings.getStoreStatus();
  }

  @Put('status')
  @UseGuards(AdminAuthGuard)
  updateStatus(@Body() body: { isOpen: boolean; notice?: string }) {
    return this.settings.setStoreStatus(body.isOpen, body.notice);
  }
}
