import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());

  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) mkdirSync(uploadsPath, { recursive: true });
  // Served outside /api/v1 so URLs are /uploads/...
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: true,
    exposedHeaders: ['X-Cart-Session', 'x-cart-session'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
  console.log(`BigBites API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
