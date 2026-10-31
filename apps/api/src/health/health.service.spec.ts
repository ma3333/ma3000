import { describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { HealthService } from './health.service';

const pool = (ok: boolean) =>
  ({
    query: vi.fn(ok ? () => Promise.resolve({}) : () => Promise.reject(new Error('down'))),
  }) as unknown as Pool;
const redis = (ok: boolean) =>
  ({
    status: 'ready',
    ping: vi.fn(ok ? () => Promise.resolve('PONG') : () => Promise.reject(new Error('down'))),
  }) as unknown as Redis;

describe('HealthService', () => {
  it('is ok when database and redis respond', async () => {
    const result = await new HealthService(pool(true), redis(true)).check();
    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'up', redis: 'up' });
  });

  it('is degraded and names the failing dependency', async () => {
    const result = await new HealthService(pool(false), redis(true)).check();
    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: 'down', redis: 'up' });
  });
});
