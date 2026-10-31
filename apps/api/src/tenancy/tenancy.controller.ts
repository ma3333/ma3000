import { Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import type { Tenant } from '@ma3000/shared';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { parseBody } from '../common/zod';
import { tenants } from '../db/schema';
import { TenantDb } from '../db/tenant-db';
import { PlatformGuard, TenantGuard, TenantId } from './tenant-context';

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['house_committee', 'management_company', 'owner']),
});

const toTenant = (r: typeof tenants.$inferSelect): Tenant => ({ id: r.id, name: r.name, type: r.type });

@Controller('platform/tenants')
@UseGuards(PlatformGuard)
export class PlatformTenantsController {
  constructor(private readonly db: TenantDb) {}

  @Get()
  list(): Promise<Tenant[]> {
    return this.db.platform(async (tx) =>
      (await tx.select().from(tenants).orderBy(asc(tenants.createdAt))).map(toTenant),
    );
  }

  @Post()
  create(@Body() body: unknown): Promise<Tenant> {
    const input = parseBody(createTenantSchema, body);
    return this.db.platform(async (tx) => toTenant((await tx.insert(tenants).values(input).returning())[0]));
  }
}

@Controller('tenant')
@UseGuards(TenantGuard)
export class CurrentTenantController {
  constructor(private readonly db: TenantDb) {}

  @Get()
  async current(@TenantId() tenantId: string): Promise<Tenant> {
    const row = await this.db.run(
      tenantId,
      async (tx) => (await tx.select().from(tenants).where(eq(tenants.id, tenantId)))[0],
    );
    if (!row) throw new NotFoundException('Tenant not found');
    return toTenant(row);
  }
}
