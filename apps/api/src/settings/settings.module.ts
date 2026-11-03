import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { StoreController } from './store.controller';

@Module({
  controllers: [SettingsController, StoreController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

