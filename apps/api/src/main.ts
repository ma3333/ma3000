import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap() {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const config = loadConfig();
  const app = await NestFactory.create(AppModule.forRoot(config));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(config.PORT);
  Logger.log(`API listening on http://localhost:${config.PORT}/api`, 'Bootstrap');
}

void bootstrap();
