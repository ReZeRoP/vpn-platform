import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StoreModule } from './store/store.module';
import { UploadModule } from './upload/upload.module';
import { ChatModule } from './chat/chat.module';
import { WalletModule } from './wallet/wallet.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { SettingsModule } from './settings/settings.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StoreModule,
    UploadModule,
    ChatModule,
    WalletModule,
    NotificationsModule,
    AdminModule,
    BootstrapModule,
    SettingsModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
