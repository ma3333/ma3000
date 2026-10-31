import { existsSync } from 'node:fs';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Local .env provides TEST_DATABASE_URL for the PostgreSQL integration tests.
if (existsSync('.env')) process.loadEnvFile('.env');

// SWC is needed so Nest's decorator metadata is emitted in tests.
export default defineConfig({
  test: { include: ['src/**/*.spec.ts'] },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
