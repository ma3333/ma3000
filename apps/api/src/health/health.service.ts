import { Inject, Injectable } from '@nestjs/common';
import type { CheckState, HealthStatus } from '@ma3000/shared';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { PG_POOL, REDIS } from '../db/db.module';

const VERSION = process.env.npm_package_version ?? '0.1.0';
const TIMEOUT_MS = 2000;

const withTimeout = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))]);

@Injectable()
export class HealthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthStatus> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    return {
      status: database === 'up' && redis === 'up' ? 'ok' : 'degraded',
      version: VERSION,
      time: new Date().toISOString(),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<CheckState> {
    try {
      await withTimeout(this.pool.query('select 1'));
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<CheckState> {
    try {
      if (this.redis.status === 'wait') await withTimeout(this.redis.connect());
      return (await withTimeout(this.redis.ping())) === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
