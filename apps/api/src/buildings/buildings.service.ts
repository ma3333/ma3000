import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NODE_ALLOWED_PARENTS } from '@ma3000/shared';
import type {
  Asset,
  Building,
  BuildingDetails,
  BuildingNode,
  BuildingWizardInput,
  NodeKind,
  Responsibility,
  UnitType,
} from '@ma3000/shared';
import { and, asc, desc, eq } from 'drizzle-orm';
import { CatalogService } from '../catalog/catalog.service';
import { assets, buildingNodes, buildings, elementTypes } from '../db/schema';
import { TenantDb, Tx } from '../db/tenant-db';
import { validateAttributes } from '../profile/attributes';
import { planBuildingTree } from '../profile/tree-builder';

export interface NewNode {
  parentId: string | null;
  kind: NodeKind;
  name: string;
  level?: number | null;
  unitType?: UnitType;
  elementTypeId?: string;
  attributes?: Record<string, unknown>;
}

export interface NodePatch {
  name?: string;
  parentId?: string | null;
  attributes?: Record<string, unknown>;
}

export interface NewAsset {
  nodeId: string | null;
  assetTypeId: string;
  name: string;
  responsibility: Responsibility;
  installDate?: string;
  attributes?: Record<string, unknown>;
}

const toBuilding = (r: typeof buildings.$inferSelect): Building => ({
  id: r.id,
  name: r.name,
  type: r.type,
  city: r.city,
  address: r.address,
  yearBuilt: r.yearBuilt,
  floorsAbove: r.floorsAbove,
  floorsBelow: r.floorsBelow,
});

const toNode = (r: typeof buildingNodes.$inferSelect): BuildingNode => ({
  id: r.id,
  parentId: r.parentId,
  kind: r.kind,
  name: r.name,
  level: r.level,
  unitType: r.unitType as UnitType | null,
  elementTypeId: r.elementTypeId,
  sort: r.sort,
  attributes: r.attributes as BuildingNode['attributes'],
});

const toAsset = (r: typeof assets.$inferSelect): Asset => ({
  id: r.id,
  nodeId: r.nodeId,
  assetTypeId: r.assetTypeId,
  name: r.name,
  responsibility: r.responsibility,
  status: r.status,
  attributes: r.attributes as Asset['attributes'],
});

@Injectable()
export class BuildingsService {
  constructor(
    private readonly db: TenantDb,
    private readonly catalog: CatalogService,
  ) {}

  list(tenantId: string): Promise<Building[]> {
    return this.db.run(tenantId, async (tx) =>
      (await tx.select().from(buildings).orderBy(desc(buildings.createdAt))).map(toBuilding),
    );
  }

  /** New-building wizard: creates the building and its initial tree in one transaction. */
  createFromWizard(tenantId: string, input: BuildingWizardInput): Promise<BuildingDetails> {
    return this.db.run(tenantId, async (tx) => {
      const types = await tx.select().from(elementTypes);
      const plan = planBuildingTree(input, types);
      const typeIdByKey = new Map(types.map((t) => [t.key, t.id]));

      const [building] = await tx
        .insert(buildings)
        .values({
          tenantId,
          name: input.name,
          type: input.type,
          city: input.city ?? null,
          address: input.address ?? null,
          yearBuilt: input.yearBuilt ?? null,
          floorsAbove: input.floorsAbove,
          floorsBelow: input.floorsBelow,
        })
        .returning();

      // Plan order guarantees parents come before children.
      const idByRef = new Map<string, string>();
      for (const n of plan) {
        const [row] = await tx
          .insert(buildingNodes)
          .values({
            tenantId,
            buildingId: building.id,
            parentId: n.parentRef ? idByRef.get(n.parentRef)! : null,
            kind: n.kind,
            name: n.name,
            level: n.level,
            unitType: n.unitType,
            elementTypeId: n.elementKey ? typeIdByKey.get(n.elementKey)! : null,
            sort: n.sort,
          })
          .returning({ id: buildingNodes.id });
        idByRef.set(n.ref, row.id);
      }
      return this.loadDetails(tx, building.id);
    });
  }

  details(tenantId: string, buildingId: string): Promise<BuildingDetails> {
    return this.db.run(tenantId, (tx) => this.loadDetails(tx, buildingId));
  }

  addNode(tenantId: string, buildingId: string, input: NewNode): Promise<BuildingNode> {
    return this.db.run(tenantId, async (tx) => {
      await this.requireBuilding(tx, buildingId);
      const parent = await this.checkParent(tx, buildingId, input.kind, input.parentId);
      if (input.kind === 'unit' && !input.unitType)
        throw new BadRequestException('ליחידה נדרש סוג (דירה, משרד…)');

      let attributes = {};
      if (input.kind === 'element') {
        if (!input.elementTypeId) throw new BadRequestException('לאלמנט נדרש סוג מהקטלוג');
        const type = (
          await tx.select().from(elementTypes).where(eq(elementTypes.id, input.elementTypeId))
        )[0];
        if (!type) throw new BadRequestException('סוג האלמנט לא נמצא');
        attributes = validateAttributes(type.attributeSchema, input.attributes);
      } else if (input.attributes && Object.keys(input.attributes).length) {
        throw new BadRequestException('שדות מותאמים זמינים כרגע רק לאלמנטים');
      }

      const [row] = await tx
        .insert(buildingNodes)
        .values({
          tenantId,
          buildingId,
          parentId: input.parentId,
          kind: input.kind,
          name: input.name,
          level: input.level ?? parent?.level ?? null,
          unitType: input.kind === 'unit' ? input.unitType : null,
          elementTypeId: input.kind === 'element' ? input.elementTypeId : null,
          sort: 1000,
          attributes,
        })
        .returning();
      return toNode(row);
    });
  }

  updateNode(tenantId: string, nodeId: string, patch: NodePatch): Promise<BuildingNode> {
    return this.db.run(tenantId, async (tx) => {
      const node = (await tx.select().from(buildingNodes).where(eq(buildingNodes.id, nodeId)))[0];
      if (!node) throw new NotFoundException('הצומת לא נמצא');
      const changes: Partial<typeof buildingNodes.$inferInsert> = {};
      if (patch.name !== undefined) changes.name = patch.name;
      if (patch.parentId !== undefined) {
        if (patch.parentId === node.id) throw new BadRequestException('צומת לא יכול להיות האב של עצמו');
        await this.checkParent(tx, node.buildingId, node.kind, patch.parentId);
        if (patch.parentId && (await this.isDescendant(tx, node.id, patch.parentId)))
          throw new BadRequestException('אי אפשר להעביר צומת אל תוך צומת שמתחתיו');
        changes.parentId = patch.parentId;
      }
      if (patch.attributes !== undefined) {
        if (node.kind !== 'element') throw new BadRequestException('שדות מותאמים זמינים כרגע רק לאלמנטים');
        const type = (
          await tx.select().from(elementTypes).where(eq(elementTypes.id, node.elementTypeId!))
        )[0];
        changes.attributes = validateAttributes(type.attributeSchema, patch.attributes);
      }
      const [row] = await tx
        .update(buildingNodes)
        .set(changes)
        .where(eq(buildingNodes.id, nodeId))
        .returning();
      return toNode(row);
    });
  }

  removeNode(tenantId: string, nodeId: string): Promise<void> {
    return this.db.run(tenantId, async (tx) => {
      const deleted = await tx
        .delete(buildingNodes)
        .where(eq(buildingNodes.id, nodeId))
        .returning({ id: buildingNodes.id });
      if (!deleted.length) throw new NotFoundException('הצומת לא נמצא');
    });
  }

  addAsset(tenantId: string, buildingId: string, input: NewAsset): Promise<Asset> {
    return this.db.run(tenantId, async (tx) => {
      await this.requireBuilding(tx, buildingId);
      if (input.nodeId) {
        const node = (await tx.select().from(buildingNodes).where(eq(buildingNodes.id, input.nodeId)))[0];
        if (!node || node.buildingId !== buildingId) throw new BadRequestException('המיקום לא שייך לבניין');
      }
      const schema = await this.catalog.effectiveAssetSchema(tx, input.assetTypeId);
      if (!schema) throw new BadRequestException('סוג הציוד לא נמצא');
      const attributes = validateAttributes(schema, input.attributes);
      const [row] = await tx
        .insert(assets)
        .values({
          tenantId,
          buildingId,
          nodeId: input.nodeId,
          assetTypeId: input.assetTypeId,
          name: input.name,
          responsibility: input.responsibility,
          installDate: input.installDate ?? null,
          attributes,
        })
        .returning();
      return toAsset(row);
    });
  }

  removeAsset(tenantId: string, assetId: string): Promise<void> {
    return this.db.run(tenantId, async (tx) => {
      const deleted = await tx.delete(assets).where(eq(assets.id, assetId)).returning({ id: assets.id });
      if (!deleted.length) throw new NotFoundException('הציוד לא נמצא');
    });
  }

  private async loadDetails(tx: Tx, buildingId: string): Promise<BuildingDetails> {
    const building = await this.requireBuilding(tx, buildingId);
    const nodes = await tx
      .select()
      .from(buildingNodes)
      .where(eq(buildingNodes.buildingId, buildingId))
      .orderBy(asc(buildingNodes.sort), asc(buildingNodes.createdAt));
    const rows = await tx
      .select()
      .from(assets)
      .where(eq(assets.buildingId, buildingId))
      .orderBy(asc(assets.createdAt));
    return { building: toBuilding(building), nodes: nodes.map(toNode), assets: rows.map(toAsset) };
  }

  private async requireBuilding(tx: Tx, buildingId: string) {
    const row = (await tx.select().from(buildings).where(eq(buildings.id, buildingId)))[0];
    if (!row) throw new NotFoundException('הבניין לא נמצא');
    return row;
  }

  private async checkParent(tx: Tx, buildingId: string, kind: NodeKind, parentId: string | null) {
    const parent = parentId
      ? (
          await tx
            .select()
            .from(buildingNodes)
            .where(and(eq(buildingNodes.id, parentId), eq(buildingNodes.buildingId, buildingId)))
        )[0]
      : null;
    if (parentId && !parent) throw new BadRequestException('צומת האב לא נמצא בבניין');
    if (!NODE_ALLOWED_PARENTS[kind].includes(parent ? parent.kind : null)) {
      throw new BadRequestException(`לא ניתן למקם ${kind} תחת ${parent ? parent.kind : 'הבניין'}`);
    }
    return parent;
  }

  private async isDescendant(tx: Tx, ancestorId: string, candidateId: string): Promise<boolean> {
    let current: string | null = candidateId;
    while (current) {
      if (current === ancestorId) return true;
      const row: { parentId: string | null } | undefined = (
        await tx
          .select({ parentId: buildingNodes.parentId })
          .from(buildingNodes)
          .where(eq(buildingNodes.id, current))
      )[0];
      current = row?.parentId ?? null;
    }
    return false;
  }
}
