import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function uploadsDir() {
  const dir = join(process.cwd(), 'uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('uploads')
@UseGuards(AdminAuthGuard)
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir()),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
          cb(null, `${randomUUID()}${ALLOWED.has(ext) ? ext : '.jpg'}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase();
        const ok = ALLOWED.has(ext) || (file.mimetype || '').startsWith('image/');
        if (!ok) {
          cb(
            new BadRequestException('Only image files are allowed (jpg, png, webp, gif)') as never,
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      url: this.uploads.publicPath(file.filename),
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
