import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC is needed so Nest's decorator metadata is emitted in tests.
export default defineConfig({
  test: { include: ['src/**/*.spec.ts'] },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
