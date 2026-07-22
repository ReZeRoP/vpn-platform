import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsAdminController } from './settings-admin.controller';
import { SettingsPublicController } from './settings-public.controller';

@Global()
@Module({
  controllers: [SettingsAdminController, SettingsPublicController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
