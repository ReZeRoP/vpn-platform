import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.wallet.summary(user.id);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: AuthUser) {
    return this.wallet.transactions(user.id);
  }
}
