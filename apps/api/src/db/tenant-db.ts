import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, Database } from './tokens';

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs work inside a transaction scoped to one tenant: switches to the restricted `ma3000_app` role and sets
 * `app.tenant_id`, so PostgreSQL RLS policies filter every read and reject cross-tenant writes.
 */
@Injectable()
export class TenantDb {
  constructor(@Inject(DB) private readonly db: Database) {}

  run<T>(tenantId: string, work: (tx: Tx) => Promise<T>): Promise<T> {
    if (!UUID_RE.test(tenantId)) throw new Error('Invalid tenant id');
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE ma3000_app`);
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      return work(tx);
    });
  }

  /** Platform-level work without tenant scoping (e.g. creating tenants). Use only from platform-admin code paths. */
  platform<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }
}
