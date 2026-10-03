import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  readonly dir = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  publicPath(filename: string) {
    return `/uploads/${filename}`;
  }
}
