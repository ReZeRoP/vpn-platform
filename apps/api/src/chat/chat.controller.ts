import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateSupportDto, MessageCursorDto } from './dto/chat.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user.id, user.role);
  }

  @Get(':id/messages')
  messages(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query() query: MessageCursorDto,
  ) {
    const before =
      query.beforeCreatedAt && query.beforeId
        ? { createdAt: new Date(query.beforeCreatedAt), id: query.beforeId }
        : undefined;
    return this.chat.getMessages(id, user.id, user.role, before);
  }

  @Post('support')
  createSupport(@CurrentUser() user: AuthUser, @Body() dto: CreateSupportDto) {
    return this.chat.createSupport(user.id, dto.title);
  }
}
