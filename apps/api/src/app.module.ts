import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

// Feature modules (auth, store, chat, wallet) will register here as we build them.
@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
