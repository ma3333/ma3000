import { DynamicModule, Global, Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { AppConfig } from '../config';
import { TenantDb } from './tenant-db';
import { CONFIG, DB, PG_POOL, REDIS } from './tokens';

export { CONFIG, DB, PG_POOL, REDIS } from './tokens';
export type { Database } from './tokens';

@Injectable()
class ConnectionCloser implements OnModuleDestroy {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onModuleDestroy() {
    await Promise.allSettled([this.pool.end(), this.redis.quit()]);
  }
}

@Global()
@Module({})
export class DbModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: DbModule,
      providers: [
        { provide: CONFIG, useValue: config },
        { provide: PG_POOL, useFactory: () => new Pool({ connectionString: config.DATABASE_URL, max: 10 }) },
        { provide: DB, inject: [PG_POOL], useFactory: (pool: Pool) => drizzle(pool) },
        {
          provide: REDIS,
          useFactory: () => new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 }),
        },
        ConnectionCloser,
        TenantDb,
      ],
      exports: [CONFIG, PG_POOL, DB, REDIS, TenantDb],
    };
  }
}
