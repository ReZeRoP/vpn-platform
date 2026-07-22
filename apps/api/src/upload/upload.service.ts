import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface UploadResult {
  url: string;
  width: number;
  height: number;
}

@Injectable()
export class UploadService {
  private s3?: S3Client;
  private bucket?: string;
  private publicUrl?: string;
  private readonly uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');

    const keyId = this.config.get<string>('S3_ACCESS_KEY_ID');
    const secret = this.config.get<string>('S3_SECRET_ACCESS_KEY');
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const bucket = this.config.get<string>('S3_BUCKET');
    const publicUrl = this.config.get<string>('S3_PUBLIC_URL');

    if (keyId && secret && endpoint && bucket && publicUrl) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId: keyId, secretAccessKey: secret },
      });
      this.bucket = bucket;
      this.publicUrl = publicUrl.replace(/\/$/, '');
    }
  }

  get isS3() {
    return !!this.s3;
  }

  private randomName(ext: string) {
    return Date.now().toString(36) + randomBytes(6).toString('hex') + ext;
  }

  // Optimize: auto-orient from EXIF, cap to 1920px on the long edge, re-encode jpeg.
  private async optimizeImage(src: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
    const buf = await sharp(src).rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const meta = await sharp(buf).metadata();
    return { buffer: buf, width: meta.width ?? 0, height: meta.height ?? 0 };
  }

  async uploadImage(src: Buffer, dir: string): Promise<UploadResult> {
    if (!src || src.length === 0) throw new BadRequestException('فایل خالی است');
    let optimized: { buffer: Buffer; width: number; height: number };
    try {
      optimized = await this.optimizeImage(src);
    } catch {
      throw new BadRequestException('فایل تصویر معتبر نیست');
    }

    const name = this.randomName('.jpg');
    const key = `${dir}/${name}`;

    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: key,
          Body: optimized.buffer,
          ContentType: 'image/jpeg',
        }),
      );
      return { url: `${this.publicUrl}/${key}`, width: optimized.width, height: optimized.height };
    }

    const dirPath = join(this.uploadDir, dir);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(join(dirPath, name), optimized.buffer);
    return { url: `/uploads/${dir}/${name}`, width: optimized.width, height: optimized.height };
  }
}
