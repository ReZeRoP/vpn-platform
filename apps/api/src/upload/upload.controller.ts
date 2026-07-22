import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('receipt')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async receipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایلی ارسال نشده است');
    if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('فقط تصویر مجاز است');
    const { url } = await this.upload.uploadImage(file.buffer, 'receipts');
    return { url };
  }

  @Post('chat')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async chat(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایلی ارسال نشده است');
    if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('فقط تصویر مجاز است');
    const { url, width, height } = await this.upload.uploadImage(file.buffer, 'chat');
    return { url, width, height };
  }
}
