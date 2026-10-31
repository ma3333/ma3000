// Types shared between the API and the web app.

export type CheckState = 'up' | 'down';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  version: string;
  time: string;
  checks: {
    database: CheckState;
    redis: CheckState;
  };
}

// ---------- Building profile (docs/18) ----------

export type AttributeFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select';

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface AttributeSchema {
  fields: AttributeField[];
}

export type Attributes = Record<string, string | number | boolean | null>;

export type TenantType = 'house_committee' | 'management_company' | 'owner';
export type BuildingType = 'residential' | 'office' | 'mixed';
export type NodeKind = 'entrance' | 'floor' | 'unit' | 'common_area' | 'element';
export type UnitType = 'apartment' | 'office' | 'store' | 'parking' | 'storage';
export type Responsibility = 'common' | 'unit_owner' | 'management_contract';
export type AssetCategory = 'safety' | 'vertical' | 'water' | 'electric' | 'hvac' | 'access' | 'other';

/** Which node kinds may hold which children (null = directly under the building). Shared by API validation and UI. */
export const NODE_ALLOWED_PARENTS: Record<NodeKind, (NodeKind | null)[]> = {
  entrance: [null],
  floor: ['entrance'],
  unit: ['floor'],
  common_area: [null, 'entrance', 'floor'],
  element: [null, 'entrance', 'floor'],
};

export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
}

export interface ElementType {
  id: string;
  key: string;
  name: string;
  defaultLevel: number | null;
  attributeSchema: AttributeSchema;
  platform: boolean;
}

export interface AssetType {
  id: string;
  key: string;
  name: string;
  category: AssetCategory;
  lifeSafety: boolean;
  baseTypeId: string | null;
  /** Own fields only; the effective schema of an extension type also includes the base type's fields. */
  attributeSchema: AttributeSchema;
  platform: boolean;
}

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  city: string | null;
  address: string | null;
  yearBuilt: number | null;
  floorsAbove: number;
  floorsBelow: number;
}

export interface BuildingNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  name: string;
  level: number | null;
  unitType: UnitType | null;
  elementTypeId: string | null;
  sort: number;
  attributes: Attributes;
}

export interface Asset {
  id: string;
  nodeId: string | null;
  assetTypeId: string;
  name: string;
  responsibility: Responsibility;
  status: string;
  attributes: Attributes;
}

/** Input of the new-building wizard (docs/18 §18.8). */
export interface BuildingWizardInput {
  name: string;
  type: BuildingType;
  city?: string;
  address?: string;
  yearBuilt?: number;
  entrances: number;
  floorsAbove: number;
  floorsBelow: number;
  unitsPerFloor: number;
  /** Platform/tenant element type keys to add, e.g. "underground_parking", "shelter", "roof". */
  elements: string[];
}

export interface BuildingDetails {
  building: Building;
  nodes: BuildingNode[];
  assets: Asset[];
}
