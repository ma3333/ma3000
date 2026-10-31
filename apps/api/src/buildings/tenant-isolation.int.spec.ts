// Integration tests against a real PostgreSQL (RLS cannot be tested with mocks).
// Requires TEST_DATABASE_URL pointing at a dedicated database whose name contains "test"; the public schema is reset.
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CatalogService } from '../catalog/catalog.service';
import { runMigrations } from '../db/migrate';
import { tenants } from '../db/schema';
import { TenantDb } from '../db/tenant-db';
import { BuildingsService } from './buildings.service';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('tenant isolation and building profile (PostgreSQL)', () => {
  let pool: Pool;
  let db: TenantDb;
  let catalog: CatalogService;
  let buildings: BuildingsService;
  let tenantA: string;
  let tenantB: string;
  let buildingA: string;

  beforeAll(async () => {
    if (!/test/i.test(new URL(url!).pathname))
      throw new Error('TEST_DATABASE_URL must point at a *test* database');
    pool = new Pool({ connectionString: url });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await runMigrations(pool);
    db = new TenantDb(drizzle(pool));
    catalog = new CatalogService(db);
    buildings = new BuildingsService(db, catalog);

    [tenantA, tenantB] = await db.platform(async (tx) =>
      (
        await tx
          .insert(tenants)
          .values([
            { name: 'ועד הרצל 10', type: 'house_committee' },
            { name: 'חברת ניהול אחרת', type: 'management_company' },
          ])
          .returning()
      ).map((t) => t.id),
    );

    const created = await buildings.createFromWizard(tenantA, {
      name: 'הרצל 10',
      type: 'residential',
      city: 'חיפה',
      entrances: 1,
      floorsAbove: 3,
      floorsBelow: 1,
      unitsPerFloor: 2,
      elements: ['underground_parking', 'shelter', 'roof'],
    });
    buildingA = created.building.id;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('wizard builds the tree: entrance, floors -1..3, lobby, 6 units and elements on the right floors', async () => {
    const { nodes } = await buildings.details(tenantA, buildingA);
    expect(nodes.filter((n) => n.kind === 'floor').map((n) => n.level)).toEqual([-1, 0, 1, 2, 3]);
    expect(nodes.filter((n) => n.kind === 'unit')).toHaveLength(6);
    const floorMinus1 = nodes.find((n) => n.kind === 'floor' && n.level === -1)!;
    const parking = nodes.find((n) => n.name === 'חניון תת-קרקעי')!;
    expect(parking.parentId).toBe(floorMinus1.id);
  });

  it('another tenant cannot list, read or modify the building', async () => {
    expect(await buildings.list(tenantB)).toEqual([]);
    await expect(buildings.details(tenantB, buildingA)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      buildings.addNode(tenantB, buildingA, { parentId: null, kind: 'entrance', name: 'פריצה' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const nodeA = (await buildings.details(tenantA, buildingA)).nodes[0];
    await expect(buildings.updateNode(tenantB, nodeA.id, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(buildings.removeNode(tenantB, nodeA.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the database itself rejects cross-tenant writes and hides rows without a tenant', async () => {
    const err = await db
      .run(tenantB, (tx) =>
        tx.execute(
          sql`INSERT INTO buildings (tenant_id, name, type) VALUES (${tenantA}, 'זדוני', 'residential')`,
        ),
      )
      .catch((e: Error & { cause?: Error }) => e);
    expect((err as Error & { cause?: Error }).cause?.message).toMatch(/row-level security/);
    const updated = await db.run(tenantB, (tx) =>
      tx.execute(sql`UPDATE buildings SET name = 'x' WHERE id = ${buildingA}`),
    );
    expect(updated.rowCount).toBe(0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN; SET LOCAL ROLE ma3000_app');
      expect((await client.query('SELECT count(*)::int AS n FROM buildings')).rows[0].n).toBe(0);
      expect((await client.query('SELECT count(*)::int AS n FROM tenants')).rows[0].n).toBe(0);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('platform catalog is shared, tenant catalog entries are private', async () => {
    const elevator = (await catalog.assetTypes(tenantA)).find((t) => t.key === 'elevator')!;
    expect((await catalog.assetTypes(tenantB)).some((t) => t.key === 'elevator')).toBe(true);

    const ext = await catalog.createAssetType(tenantA, {
      key: 'elevator_ext',
      name: 'מעלית (מורחב)',
      category: 'vertical',
      baseTypeId: elevator.id,
      fields: [{ key: 'service_company', label: 'חברת שירות', type: 'text', required: true }],
    });
    expect((await catalog.assetTypes(tenantB)).some((t) => t.id === ext.id)).toBe(false);

    // Tenant B cannot use tenant A's private type.
    const buildingB = (
      await buildings.createFromWizard(tenantB, {
        name: 'מגדל',
        type: 'office',
        entrances: 1,
        floorsAbove: 2,
        floorsBelow: 0,
        unitsPerFloor: 1,
        elements: [],
      })
    ).building.id;
    await expect(
      buildings.addAsset(tenantB, buildingB, {
        nodeId: null,
        assetTypeId: ext.id,
        name: 'x',
        responsibility: 'common',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('asset attributes are validated against the effective schema (base + extension fields)', async () => {
    const ext = (await catalog.assetTypes(tenantA)).find((t) => t.key === 'elevator_ext')!;
    await expect(
      buildings.addAsset(tenantA, buildingA, {
        nodeId: null,
        assetTypeId: ext.id,
        name: 'מעלית A',
        responsibility: 'common',
        attributes: { stops: 5 },
      }),
    ).rejects.toThrow(/חובה/);

    const unit = (await buildings.details(tenantA, buildingA)).nodes.find((n) => n.kind === 'unit')!;
    const asset = await buildings.addAsset(tenantA, buildingA, {
      nodeId: unit.id,
      assetTypeId: ext.id,
      name: 'מעלית A',
      responsibility: 'management_contract',
      attributes: { stops: '5', shabbat: true, service_company: 'מעליות בע"מ' },
    });
    expect(asset.attributes).toEqual({ stops: 5, shabbat: true, service_company: 'מעליות בע"מ' });
  });

  it('enforces tree structure rules and prevents cycles', async () => {
    const { nodes } = await buildings.details(tenantA, buildingA);
    const entrance = nodes.find((n) => n.kind === 'entrance')!;
    const floor1 = nodes.find((n) => n.kind === 'floor' && n.level === 1)!;
    await expect(
      buildings.addNode(tenantA, buildingA, {
        parentId: entrance.id,
        kind: 'unit',
        name: 'דירה',
        unitType: 'apartment',
      }),
    ).rejects.toThrow(/לא ניתן למקם/);
    const store = await buildings.addNode(tenantA, buildingA, {
      parentId: floor1.id,
      kind: 'unit',
      name: 'חנות 1',
      unitType: 'store',
    });
    expect(store.level).toBe(1);
    const gym = await buildings.addNode(tenantA, buildingA, {
      parentId: entrance.id,
      kind: 'element',
      name: 'חדר כושר',
      elementTypeId: (await catalog.elementTypes(tenantA)).find((t) => t.key === 'gym')!.id,
    });
    await expect(buildings.updateNode(tenantA, gym.id, { parentId: gym.id })).rejects.toThrow(/של עצמו/);
  });
});
