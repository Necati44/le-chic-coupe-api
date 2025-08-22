import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { PrismaClientExceptionFilter } from '@common/filters/prisma-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS : limite au domaine du front
  app.enableCors({
    origin: ['https://www.lechiccoupe.fr', 'https://ton-projet.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false,
  });
  app.use(helmet());
  app.enableShutdownHooks(); // active les hooks d'arrêt (SIGINT/SIGTERM)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaClientExceptionFilter());
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
