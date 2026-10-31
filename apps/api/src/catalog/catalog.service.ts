import { BadRequestException, Injectable } from '@nestjs/common';
import type { AssetType, AttributeSchema, ElementType } from '@ma3000/shared';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { assetTypes, elementTypes } from '../db/schema';
import { TenantDb, Tx } from '../db/tenant-db';
import { mergeSchemas, validateSchema } from '../profile/attributes';

export interface NewAssetType {
  key: string;
  name: string;
  category: AssetType['category'];
  baseTypeId?: string;
  fields: AttributeSchema['fields'];
}

const toElementType = (r: typeof elementTypes.$inferSelect): ElementType => ({
  id: r.id,
  key: r.key,
  name: r.name,
  defaultLevel: r.defaultLevel,
  attributeSchema: r.attributeSchema,
  platform: r.tenantId === null,
});

const toAssetType = (r: typeof assetTypes.$inferSelect): AssetType => ({
  id: r.id,
  key: r.key,
  name: r.name,
  category: r.category as AssetType['category'],
  lifeSafety: r.lifeSafety,
  baseTypeId: r.baseTypeId,
  attributeSchema: r.attributeSchema,
  platform: r.tenantId === null,
});

/** Two-level catalog (platform + tenant). RLS makes platform rows visible to everyone and tenant rows to their owner. */
@Injectable()
export class CatalogService {
  constructor(private readonly db: TenantDb) {}

  elementTypes(tenantId: string): Promise<ElementType[]> {
    return this.db.run(tenantId, async (tx) =>
      (await tx.select().from(elementTypes).orderBy(asc(elementTypes.name))).map(toElementType),
    );
  }

  assetTypes(tenantId: string): Promise<AssetType[]> {
    return this.db.run(tenantId, async (tx) =>
      (await tx.select().from(assetTypes).orderBy(asc(assetTypes.category), asc(assetTypes.name))).map(
        toAssetType,
      ),
    );
  }

  /** Tenant-defined asset type: a brand-new type, or an extension that adds fields to an existing (e.g. platform) type. */
  createAssetType(tenantId: string, input: NewAssetType): Promise<AssetType> {
    const schema: AttributeSchema = { fields: input.fields };
    const errors = validateSchema(schema);
    if (errors.length) throw new BadRequestException({ message: 'הגדרת שדות לא תקינה', errors });

    return this.db.run(tenantId, async (tx) => {
      let lifeSafety = false;
      if (input.baseTypeId) {
        const base = (await tx.select().from(assetTypes).where(eq(assetTypes.id, input.baseTypeId)))[0];
        if (!base) throw new BadRequestException('סוג הבסיס לא נמצא');
        lifeSafety = base.lifeSafety; // an extension can never drop the life-safety flag
      }
      const exists = await tx
        .select({ id: assetTypes.id })
        .from(assetTypes)
        .where(
          and(
            eq(assetTypes.key, input.key),
            or(isNull(assetTypes.tenantId), eq(assetTypes.tenantId, tenantId)),
          ),
        );
      if (exists.length) throw new BadRequestException(`המפתח ${input.key} כבר קיים בקטלוג`);

      const [row] = await tx
        .insert(assetTypes)
        .values({
          tenantId,
          key: input.key,
          name: input.name,
          category: input.category,
          lifeSafety,
          baseTypeId: input.baseTypeId ?? null,
          attributeSchema: schema,
        })
        .returning();
      return toAssetType(row);
    });
  }

  /** Effective schema of an asset type = base type fields + own fields. */
  async effectiveAssetSchema(tx: Tx, assetTypeId: string): Promise<AttributeSchema | null> {
    const type = (await tx.select().from(assetTypes).where(eq(assetTypes.id, assetTypeId)))[0];
    if (!type) return null;
    if (!type.baseTypeId) return type.attributeSchema;
    const base = (await tx.select().from(assetTypes).where(eq(assetTypes.id, type.baseTypeId)))[0];
    return mergeSchemas(base?.attributeSchema, type.attributeSchema);
  }
}
