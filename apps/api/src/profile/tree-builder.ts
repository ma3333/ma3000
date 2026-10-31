import type { BuildingWizardInput, NodeKind, UnitType } from '@ma3000/shared';

export interface PlannedNode {
  ref: string;
  parentRef: string | null;
  kind: NodeKind;
  name: string;
  level: number | null;
  unitType: UnitType | null;
  elementKey: string | null;
  sort: number;
}

export interface ElementTypeInfo {
  key: string;
  name: string;
  defaultLevel: number | null;
}

const ENTRANCE_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת';

export const floorName = (level: number) => (level === 0 ? 'קומת קרקע' : `קומה ${level}`);

/**
 * Generates the initial building tree from wizard answers (docs/18 §18.8):
 * entrances → floors (incl. underground) → units, a lobby on the ground floor, and the selected elements
 * placed on the matching floor of the first entrance (or at building level when they have no default floor).
 * Pure function: the caller persists the result.
 */
export function planBuildingTree(input: BuildingWizardInput, elementTypes: ElementTypeInfo[]): PlannedNode[] {
  const nodes: PlannedNode[] = [];
  const unitType: UnitType = input.type === 'office' ? 'office' : 'apartment';
  const unitLabel = unitType === 'office' ? 'משרד' : 'דירה';
  const firstEntranceFloors = new Map<number, string>();
  let unitNo = 1;

  for (let e = 0; e < input.entrances; e++) {
    const entranceRef = `entrance-${e}`;
    const entranceName = input.entrances === 1 ? 'כניסה ראשית' : `כניסה ${ENTRANCE_LETTERS[e] ?? e + 1}`;
    nodes.push({
      ref: entranceRef,
      parentRef: null,
      kind: 'entrance',
      name: entranceName,
      level: null,
      unitType: null,
      elementKey: null,
      sort: e,
    });

    for (let level = -input.floorsBelow; level <= input.floorsAbove; level++) {
      const floorRef = `${entranceRef}-floor${level}`;
      nodes.push({
        ref: floorRef,
        parentRef: entranceRef,
        kind: 'floor',
        name: floorName(level),
        level,
        unitType: null,
        elementKey: null,
        sort: level,
      });
      if (e === 0) firstEntranceFloors.set(level, floorRef);

      if (level === 0) {
        nodes.push({
          ref: `${floorRef}-lobby`,
          parentRef: floorRef,
          kind: 'common_area',
          name: 'לובי',
          level,
          unitType: null,
          elementKey: null,
          sort: 0,
        });
      }
      if (level >= 1) {
        for (let u = 0; u < input.unitsPerFloor; u++, unitNo++) {
          nodes.push({
            ref: `${floorRef}-unit${unitNo}`,
            parentRef: floorRef,
            kind: 'unit',
            name: `${unitLabel} ${unitNo}`,
            level,
            unitType,
            elementKey: null,
            sort: u,
          });
        }
      }
    }
  }

  const byKey = new Map(elementTypes.map((t) => [t.key, t]));
  input.elements.forEach((key, i) => {
    const type = byKey.get(key);
    if (!type) throw new Error(`Unknown element type: ${key}`);
    let level = type.defaultLevel;
    if (key === 'roof') level = input.floorsAbove + 1;
    // Clamp underground elements to the deepest existing floor; drop the floor link when the building has none.
    if (level !== null && level < 0)
      level = input.floorsBelow > 0 ? Math.max(level, -input.floorsBelow) : null;
    const parentRef = level !== null ? (firstEntranceFloors.get(level) ?? null) : null;
    nodes.push({
      ref: `element-${key}`,
      parentRef,
      kind: 'element',
      name: type.name,
      level,
      unitType: null,
      elementKey: key,
      sort: 100 + i,
    });
  });

  return nodes;
}
