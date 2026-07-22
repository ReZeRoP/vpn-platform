import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles, RolesGuard } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getAll() {
    return this.settings.getAll();
  }

  @Patch()
  async update(@Body() body: Record<string, string>) {
    await this.settings.setMany(body);
    return { success: true };
  }
}
