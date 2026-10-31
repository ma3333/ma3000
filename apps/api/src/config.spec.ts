import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('parses a valid environment and applies defaults', () => {
    const cfg = loadConfig({
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
    });
    expect(cfg.PORT).toBe(3000);
  });

  it('reports missing variables by name', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL.*REDIS_URL/);
  });
});
