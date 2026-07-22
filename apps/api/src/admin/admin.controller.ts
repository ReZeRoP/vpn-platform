import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles, RolesGuard } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdjustWalletDto } from '../wallet/dto/wallet.dto';
import { WalletService } from '../wallet/wallet.service';
import { AdminService } from './admin.service';
import { CreateCouponDto, UpdateCouponDto, UpdateUserDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly wallet: WalletService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  users(@Query('search') search?: string) {
    return this.admin.users(search?.trim());
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @CurrentUser() current: AuthUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(id, current.id, dto);
  }

  @Post('wallet/:userId/adjust')
  adjustWallet(
    @Param('userId') userId: string,
    @CurrentUser() current: AuthUser,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.wallet.adjust(userId, dto.amount, dto.note, current.id);
  }

  @Get('coupons')
  coupons() {
    return this.admin.coupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.admin.createCoupon(dto);
  }

  @Patch('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.admin.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.admin.deleteCoupon(id);
  }
}
