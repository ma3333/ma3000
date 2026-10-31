import { describe, expect, it } from 'vitest';
import { planBuildingTree } from './tree-builder';

const elements = [
  { key: 'underground_parking', name: 'חניון תת-קרקעי', defaultLevel: -1 },
  { key: 'roof', name: 'גג', defaultLevel: null },
  { key: 'garden', name: 'גינה / חצר', defaultLevel: 0 },
  { key: 'gym', name: 'חדר כושר', defaultLevel: null },
];

const base = {
  name: 'הרצל 10',
  type: 'residential' as const,
  entrances: 2,
  floorsAbove: 4,
  floorsBelow: 2,
  unitsPerFloor: 2,
  elements: [],
};

describe('planBuildingTree', () => {
  it('creates entrances, floors incl. underground, units and a lobby per entrance', () => {
    const nodes = planBuildingTree(base, elements);
    expect(nodes.filter((n) => n.kind === 'entrance').map((n) => n.name)).toEqual(['כניסה א', 'כניסה ב']);
    const floors = nodes
      .filter((n) => n.kind === 'floor' && n.parentRef === 'entrance-0')
      .map((n) => n.level);
    expect(floors).toEqual([-2, -1, 0, 1, 2, 3, 4]);
    const units = nodes.filter((n) => n.kind === 'unit');
    expect(units).toHaveLength(2 * 4 * 2);
    expect(units.at(-1)?.name).toBe('דירה 16');
    expect(nodes.filter((n) => n.kind === 'common_area')).toHaveLength(2);
  });

  it('places elements on the matching floor of the first entrance', () => {
    const nodes = planBuildingTree({ ...base, elements: ['underground_parking', 'garden', 'gym'] }, elements);
    expect(nodes.find((n) => n.elementKey === 'underground_parking')?.parentRef).toBe('entrance-0-floor-1');
    expect(nodes.find((n) => n.elementKey === 'garden')?.parentRef).toBe('entrance-0-floor0');
    expect(nodes.find((n) => n.elementKey === 'gym')?.parentRef).toBeNull();
  });

  it('puts the roof above the top floor and uses offices for office buildings', () => {
    const nodes = planBuildingTree({ ...base, type: 'office', entrances: 1, elements: ['roof'] }, elements);
    expect(nodes.find((n) => n.elementKey === 'roof')?.level).toBe(5);
    expect(nodes.find((n) => n.kind === 'unit')?.name).toBe('משרד 1');
    expect(nodes[0].name).toBe('כניסה ראשית');
  });

  it('keeps underground elements at building level when there are no underground floors', () => {
    const nodes = planBuildingTree({ ...base, floorsBelow: 0, elements: ['underground_parking'] }, elements);
    const parking = nodes.find((n) => n.elementKey === 'underground_parking');
    expect(parking?.parentRef).toBeNull();
    expect(parking?.level).toBeNull();
  });

  it('rejects unknown element types', () => {
    expect(() => planBuildingTree({ ...base, elements: ['spaceship'] }, elements)).toThrow(/Unknown element/);
  });
});
