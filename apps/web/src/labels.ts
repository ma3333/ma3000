import type {
  AssetCategory,
  BuildingType,
  NodeKind,
  Responsibility,
  TenantType,
  UnitType,
} from '@ma3000/shared';

// Hebrew UI labels (kept in one place so they can move to i18n files later).
export const TENANT_TYPE: Record<TenantType, string> = {
  house_committee: 'ועד בית',
  management_company: 'חברת ניהול',
  owner: 'בעלים',
};
export const BUILDING_TYPE: Record<BuildingType, string> = {
  residential: 'מגורים',
  office: 'משרדים',
  mixed: 'מעורב',
};
export const NODE_KIND: Record<NodeKind, string> = {
  entrance: 'כניסה',
  floor: 'קומה',
  unit: 'יחידה',
  common_area: 'שטח משותף',
  element: 'אלמנט',
};
export const UNIT_TYPE: Record<UnitType, string> = {
  apartment: 'דירה',
  office: 'משרד',
  store: 'חנות',
  parking: 'חניה',
  storage: 'מחסן',
};
export const RESPONSIBILITY: Record<Responsibility, string> = {
  common: 'רכוש משותף',
  unit_owner: 'בעל היחידה',
  management_contract: 'חוזה תחזוקה (חברת ניהול)',
};
export const CATEGORY: Record<AssetCategory, string> = {
  safety: 'בטיחות',
  vertical: 'מעליות',
  water: 'מים וביוב',
  electric: 'חשמל ואנרגיה',
  hvac: 'מיזוג',
  access: 'כניסה ואבטחה',
  other: 'אחר',
};
export const NODE_ICON: Record<NodeKind, string> = {
  entrance: '🚪',
  floor: '▤',
  unit: '⌂',
  common_area: '◇',
  element: '★',
};
