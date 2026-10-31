import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AssetType, ElementType } from '@ma3000/shared';
import { z } from 'zod';
import { parseBody } from '../common/zod';
import { TenantGuard, TenantId } from '../tenancy/tenant-context';
import { CatalogService } from './catalog.service';

const fieldSchema = z.object({
  key: z.string(),
  label: z.string().trim().min(1).max(60),
  type: z.enum(['text', 'number', 'boolean', 'date', 'select']),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const newAssetTypeSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, 'אותיות באנגלית קטנות, ספרות וקו תחתון'),
  name: z.string().trim().min(2).max(80),
  category: z.enum(['safety', 'vertical', 'water', 'electric', 'hvac', 'access', 'other']),
  baseTypeId: z.string().uuid().optional(),
  fields: z.array(fieldSchema).max(40).default([]),
});

@Controller('catalog')
@UseGuards(TenantGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('element-types')
  elementTypes(@TenantId() tenantId: string): Promise<ElementType[]> {
    return this.catalog.elementTypes(tenantId);
  }

  @Get('asset-types')
  assetTypes(@TenantId() tenantId: string): Promise<AssetType[]> {
    return this.catalog.assetTypes(tenantId);
  }

  @Post('asset-types')
  createAssetType(@TenantId() tenantId: string, @Body() body: unknown): Promise<AssetType> {
    return this.catalog.createAssetType(tenantId, parseBody(newAssetTypeSchema, body));
  }
}
