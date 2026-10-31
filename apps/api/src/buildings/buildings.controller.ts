import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Asset, Building, BuildingDetails, BuildingNode } from '@ma3000/shared';
import { z } from 'zod';
import { parseBody, withAttributeErrors } from '../common/zod';
import { TenantGuard, TenantId } from '../tenancy/tenant-context';
import { BuildingsService } from './buildings.service';

const name = z.string().trim().min(1).max(120);
const attributes = z.record(z.string(), z.unknown()).optional();

const wizardSchema = z.object({
  name,
  type: z.enum(['residential', 'office', 'mixed']),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(160).optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  entrances: z.number().int().min(1).max(20),
  floorsAbove: z.number().int().min(0).max(120),
  floorsBelow: z.number().int().min(0).max(10),
  unitsPerFloor: z.number().int().min(0).max(50),
  elements: z.array(z.string()).max(30).default([]),
});

const nodeSchema = z.object({
  parentId: z.string().uuid().nullable(),
  kind: z.enum(['entrance', 'floor', 'unit', 'common_area', 'element']),
  name,
  level: z.number().int().min(-10).max(130).nullable().optional(),
  unitType: z.enum(['apartment', 'office', 'store', 'parking', 'storage']).optional(),
  elementTypeId: z.string().uuid().optional(),
  attributes,
});

const nodePatchSchema = z.object({
  name: name.optional(),
  parentId: z.string().uuid().nullable().optional(),
  attributes,
});

const assetSchema = z.object({
  nodeId: z.string().uuid().nullable(),
  assetTypeId: z.string().uuid(),
  name,
  responsibility: z.enum(['common', 'unit_owner', 'management_contract']),
  installDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  attributes,
});

@Controller()
@UseGuards(TenantGuard)
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get('buildings')
  list(@TenantId() tenantId: string): Promise<Building[]> {
    return this.buildings.list(tenantId);
  }

  @Post('buildings')
  create(@TenantId() tenantId: string, @Body() body: unknown): Promise<BuildingDetails> {
    return this.buildings.createFromWizard(tenantId, parseBody(wizardSchema, body));
  }

  @Get('buildings/:id')
  details(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<BuildingDetails> {
    return this.buildings.details(tenantId, id);
  }

  @Post('buildings/:id/nodes')
  addNode(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<BuildingNode> {
    return withAttributeErrors(() => this.buildings.addNode(tenantId, id, parseBody(nodeSchema, body)));
  }

  @Patch('nodes/:id')
  updateNode(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<BuildingNode> {
    return withAttributeErrors(() =>
      this.buildings.updateNode(tenantId, id, parseBody(nodePatchSchema, body)),
    );
  }

  @Delete('nodes/:id')
  @HttpCode(204)
  removeNode(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.buildings.removeNode(tenantId, id);
  }

  @Post('buildings/:id/assets')
  addAsset(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<Asset> {
    return withAttributeErrors(() => this.buildings.addAsset(tenantId, id, parseBody(assetSchema, body)));
  }

  @Delete('assets/:id')
  @HttpCode(204)
  removeAsset(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.buildings.removeAsset(tenantId, id);
  }
}
