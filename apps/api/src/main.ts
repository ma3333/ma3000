import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { loadConfig } from './config';
import { runMigrations } from './db/migrate';

async function bootstrap() {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const config = loadConfig();
  if (config.MIGRATE_ON_START) {
    const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 });
    const applied = await runMigrations(pool).finally(() => pool.end());
    if (applied.length) Logger.log(`Applied migrations: ${applied.join(', ')}`, 'Migrations');
  }
  const app = await NestFactory.create(AppModule.forRoot(config));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(config.PORT);
  Logger.log(`API listening on http://localhost:${config.PORT}/api`, 'Bootstrap');
}

void bootstrap();
