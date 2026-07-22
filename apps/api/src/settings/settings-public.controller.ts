import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  /** Returns card details for the checkout page. No auth required. */
  @Get('public')
  async getPublic() {
    return this.settings.getPublic();
  }
}
