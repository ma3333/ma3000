// Drizzle table definitions used for typed queries. The DDL (including RLS policies) lives in apps/api/migrations/*.sql.
import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { AttributeSchema } from '@ma3000/shared';

const attributes = () => jsonb('attributes').$type<Record<string, unknown>>().notNull().default({});
const attributeSchema = () =>
  jsonb('attribute_schema').$type<AttributeSchema>().notNull().default({ fields: [] });

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').$type<'house_committee' | 'management_company' | 'owner'>().notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const elementTypes = pgTable('element_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  key: text('key').notNull(),
  name: text('name').notNull(),
  defaultLevel: integer('default_level'),
  attributeSchema: attributeSchema(),
});

export const assetTypes = pgTable('asset_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  key: text('key').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  lifeSafety: boolean('life_safety').notNull().default(false),
  baseTypeId: uuid('base_type_id'),
  attributeSchema: attributeSchema(),
});

export const buildings = pgTable('buildings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  type: text('type').$type<'residential' | 'office' | 'mixed'>().notNull(),
  city: text('city'),
  address: text('address'),
  yearBuilt: integer('year_built'),
  floorsAbove: integer('floors_above').notNull().default(0),
  floorsBelow: integer('floors_below').notNull().default(0),
  attributes: attributes(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const buildingNodes = pgTable('building_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  buildingId: uuid('building_id').notNull(),
  parentId: uuid('parent_id'),
  kind: text('kind').$type<'entrance' | 'floor' | 'unit' | 'common_area' | 'element'>().notNull(),
  name: text('name').notNull(),
  level: integer('level'),
  unitType: text('unit_type'),
  elementTypeId: uuid('element_type_id'),
  sort: integer('sort').notNull().default(0),
  attributes: attributes(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  buildingId: uuid('building_id').notNull(),
  nodeId: uuid('node_id'),
  assetTypeId: uuid('asset_type_id').notNull(),
  name: text('name').notNull(),
  responsibility: text('responsibility').$type<'common' | 'unit_owner' | 'management_contract'>().notNull(),
  status: text('status').notNull().default('active'),
  installDate: date('install_date'),
  attributes: attributes(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
