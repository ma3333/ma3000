import {
  NODE_ALLOWED_PARENTS,
  type Asset,
  type AssetType,
  type AttributeSchema,
  type Attributes,
  type BuildingDetails,
  type BuildingNode,
  type ElementType,
  type NodeKind,
  type Responsibility,
  type UnitType,
} from '@ma3000/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorText } from '../api';
import { AttributeForm, compact } from '../AttributeForm';
import { BUILDING_TYPE, CATEGORY, NODE_ICON, NODE_KIND, RESPONSIBILITY, UNIT_TYPE } from '../labels';
import { navigate } from '../router';

type Selection = string | null; // null = the building itself

interface Catalog {
  elementTypes: ElementType[];
  assetTypes: AssetType[];
}

const effectiveSchema = (type: AssetType | undefined, all: AssetType[]): AttributeSchema => {
  if (!type) return { fields: [] };
  const base = type.baseTypeId ? all.find((t) => t.id === type.baseTypeId) : undefined;
  const byKey = new Map(
    [...(base?.attributeSchema.fields ?? []), ...type.attributeSchema.fields].map((f) => [f.key, f]),
  );
  return { fields: [...byKey.values()] };
};

function Tree({
  nodes,
  parentId,
  selected,
  onSelect,
  depth,
}: {
  nodes: Map<string | null, BuildingNode[]>;
  parentId: string | null;
  selected: Selection;
  onSelect: (id: Selection) => void;
  depth: number;
}) {
  const children = nodes.get(parentId) ?? [];
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!children.length) return null;
  return (
    <ul className="tree" role={depth === 0 ? 'tree' : 'group'}>
      {children.map((n) => {
        const hasChildren = (nodes.get(n.id)?.length ?? 0) > 0;
        const isOpen = open[n.id] ?? n.kind === 'entrance';
        return (
          <li key={n.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
            <div className={`tree-row ${selected === n.id ? 'selected' : ''}`}>
              {hasChildren ? (
                <button
                  className="toggle"
                  onClick={() => setOpen({ ...open, [n.id]: !isOpen })}
                  aria-label={isOpen ? 'סגור' : 'פתח'}
                >
                  {isOpen ? '▾' : '◂'}
                </button>
              ) : (
                <span className="toggle" />
              )}
              <button className="tree-label" onClick={() => onSelect(n.id)}>
                <span className={`kind kind-${n.kind}`}>{NODE_ICON[n.kind]}</span> {n.name}
                {hasChildren && !isOpen && <span className="muted"> ({nodes.get(n.id)!.length})</span>}
              </button>
            </div>
            {isOpen && (
              <Tree nodes={nodes} parentId={n.id} selected={selected} onSelect={onSelect} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AddNodeForm({
  buildingId,
  parent,
  catalog,
  onDone,
}: {
  buildingId: string;
  parent: BuildingNode | null;
  catalog: Catalog;
  onDone: () => void;
}) {
  const kinds = (Object.keys(NODE_ALLOWED_PARENTS) as NodeKind[]).filter((k) =>
    NODE_ALLOWED_PARENTS[k].includes(parent?.kind ?? null),
  );
  const [kind, setKind] = useState<NodeKind | ''>('');
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('apartment');
  const [elementTypeId, setElementTypeId] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');

  if (!kinds.length) return null;

  const submit = async () => {
    try {
      await api.addNode(buildingId, {
        parentId: parent?.id ?? null,
        kind,
        name,
        unitType: kind === 'unit' ? unitType : undefined,
        elementTypeId: kind === 'element' ? elementTypeId : undefined,
        level: kind === 'floor' && level !== '' ? Number(level) : undefined,
      });
      setKind('');
      setName('');
      setLevel('');
      onDone();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="subcard">
      <h3>הוספה {parent ? `תחת "${parent.name}"` : 'לבניין'}</h3>
      <div className="attr-grid">
        <label>
          מה להוסיף
          <select value={kind} onChange={(e) => setKind(e.target.value as NodeKind)}>
            <option value="">בחר…</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {NODE_KIND[k]}
              </option>
            ))}
          </select>
        </label>
        {kind === 'element' && (
          <label>
            סוג אלמנט
            <select
              value={elementTypeId}
              onChange={(e) => {
                setElementTypeId(e.target.value);
                setName(catalog.elementTypes.find((t) => t.id === e.target.value)?.name ?? '');
              }}
            >
              <option value="">בחר…</option>
              {catalog.elementTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'unit' && (
          <label>
            סוג יחידה
            <select value={unitType} onChange={(e) => setUnitType(e.target.value as UnitType)}>
              {Object.entries(UNIT_TYPE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'floor' && (
          <label>
            מספר קומה (שלילי = מתחת לקרקע)
            <input type="number" value={level} onChange={(e) => setLevel(e.target.value)} />
          </label>
        )}
        {kind && (
          <label>
            שם
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {kind && (
        <button onClick={submit} disabled={!name.trim() || (kind === 'element' && !elementTypeId)}>
          הוסף
        </button>
      )}
    </div>
  );
}

function AssetsSection({
  buildingId,
  node,
  assets,
  catalog,
  onChange,
}: {
  buildingId: string;
  node: BuildingNode | null;
  assets: Asset[];
  catalog: Catalog;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [typeId, setTypeId] = useState('');
  const [name, setName] = useState('');
  const [responsibility, setResponsibility] = useState<Responsibility>(
    node?.kind === 'unit' ? 'unit_owner' : 'common',
  );
  const [values, setValues] = useState<Attributes>({});
  const [error, setError] = useState('');
  const typeById = useMemo(() => new Map(catalog.assetTypes.map((t) => [t.id, t])), [catalog.assetTypes]);
  const type = typeById.get(typeId);

  const submit = async () => {
    try {
      await api.addAsset(buildingId, {
        nodeId: node?.id ?? null,
        assetTypeId: typeId,
        name,
        responsibility,
        attributes: compact(values),
      });
      setAdding(false);
      setTypeId('');
      setName('');
      setValues({});
      setError('');
      onChange();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const remove = async (a: Asset) => {
    if (!confirm(`למחוק את "${a.name}"?`)) return;
    await api.removeAsset(a.id).then(onChange, (e) => setError(errorText(e)));
  };

  const byCategory = Object.entries(CATEGORY).map(([cat, label]) => ({
    label,
    types: catalog.assetTypes.filter((t) => t.category === cat),
  }));

  return (
    <div className="subcard">
      <h3>ציוד ומערכות {node ? `ב"${node.name}"` : 'ברמת הבניין'}</h3>
      {assets.length === 0 && <p className="muted">אין ציוד רשום כאן.</p>}
      <ul className="asset-list">
        {assets.map((a) => {
          const t = typeById.get(a.assetTypeId);
          const schema = effectiveSchema(t, catalog.assetTypes);
          return (
            <li key={a.id}>
              <div>
                <strong>{a.name}</strong> <span className="muted">· {t?.name}</span>
                {t?.lifeSafety && <span className="badge badge-safety">בטיחות חיים</span>}
                <div className="muted small">
                  אחריות: {RESPONSIBILITY[a.responsibility]}
                  {schema.fields
                    .filter((f) => a.attributes[f.key] !== undefined)
                    .map(
                      (f) =>
                        ` · ${f.label}: ${a.attributes[f.key] === true ? 'כן' : a.attributes[f.key] === false ? 'לא' : a.attributes[f.key]}`,
                    )}
                </div>
              </div>
              <button className="link danger" onClick={() => remove(a)}>
                מחק
              </button>
            </li>
          );
        })}
      </ul>
      {adding ? (
        <>
          <div className="attr-grid">
            <label>
              סוג ציוד
              <select
                value={typeId}
                onChange={(e) => {
                  setTypeId(e.target.value);
                  setValues({});
                  setName(typeById.get(e.target.value)?.name ?? '');
                }}
              >
                <option value="">בחר…</option>
                {byCategory
                  .filter((g) => g.types.length)
                  .map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.platform ? '' : ' (שלנו)'}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </label>
            <label>
              שם / זיהוי
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: מעלית כניסה א"
              />
            </label>
            <label>
              באחריות
              <select
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value as Responsibility)}
              >
                {Object.entries(RESPONSIBILITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {type && (
            <AttributeForm
              schema={effectiveSchema(type, catalog.assetTypes)}
              values={values}
              onChange={setValues}
            />
          )}
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button onClick={submit} disabled={!typeId || !name.trim()}>
              שמור ציוד
            </button>
            <button className="link" onClick={() => setAdding(false)}>
              ביטול
            </button>
          </div>
        </>
      ) : (
        <button className="secondary" onClick={() => setAdding(true)}>
          + הוסף ציוד
        </button>
      )}
    </div>
  );
}

function NodePanel({
  details,
  node,
  catalog,
  reload,
  onSelect,
}: {
  details: BuildingDetails;
  node: BuildingNode | null;
  catalog: Catalog;
  reload: () => void;
  onSelect: (id: Selection) => void;
}) {
  const [name, setName] = useState(node?.name ?? '');
  const [values, setValues] = useState<Attributes>(node?.attributes ?? {});
  const [error, setError] = useState('');
  const elementType = node?.elementTypeId
    ? catalog.elementTypes.find((t) => t.id === node.elementTypeId)
    : undefined;
  const assets = details.assets.filter((a) => a.nodeId === (node?.id ?? null));
  const b = details.building;

  const save = async (patch: object) => {
    try {
      await api.updateNode(node!.id, patch);
      setError('');
      reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const remove = async () => {
    if (!confirm(`למחוק את "${node!.name}" וכל מה שמתחתיו?`)) return;
    try {
      await api.removeNode(node!.id);
      onSelect(node!.parentId);
      reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <section className="panel">
      {node ? (
        <>
          <h2>
            {NODE_ICON[node.kind]} {node.name}
          </h2>
          <p className="muted">
            {NODE_KIND[node.kind]}
            {node.unitType && ` · ${UNIT_TYPE[node.unitType]}`}
            {elementType && ` · ${elementType.name}`}
            {node.level !== null && ` · ${node.level === 0 ? 'קומת קרקע' : `קומה ${node.level}`}`}
          </p>
          <div className="subcard">
            <div className="inline-form">
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="שם" />
              <button
                className="secondary"
                onClick={() => save({ name })}
                disabled={!name.trim() || name === node.name}
              >
                שנה שם
              </button>
              <button className="link danger" onClick={remove}>
                מחק
              </button>
            </div>
            {elementType && elementType.attributeSchema.fields.length > 0 && (
              <>
                <h3>פרטי {elementType.name}</h3>
                <AttributeForm schema={elementType.attributeSchema} values={values} onChange={setValues} />
                <button className="secondary" onClick={() => save({ attributes: compact(values) })}>
                  שמור פרטים
                </button>
              </>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </>
      ) : (
        <>
          <h2>{b.name}</h2>
          <p className="muted">
            {BUILDING_TYPE[b.type]} · {[b.address, b.city].filter(Boolean).join(', ') || 'ללא כתובת'}
            {b.yearBuilt && ` · נבנה ב-${b.yearBuilt}`}
          </p>
        </>
      )}
      <AssetsSection
        key={`assets-${node?.id ?? 'root'}`}
        buildingId={b.id}
        node={node}
        assets={assets}
        catalog={catalog}
        onChange={reload}
      />
      <AddNodeForm
        key={`add-${node?.id ?? 'root'}`}
        buildingId={b.id}
        parent={node}
        catalog={catalog}
        onDone={reload}
      />
    </section>
  );
}

export function BuildingPage({ id }: { id: string }) {
  const [details, setDetails] = useState<BuildingDetails | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => api.building(id).then(setDetails, (e) => setError(errorText(e))), [id]);
  useEffect(() => {
    void reload();
    Promise.all([api.elementTypes(), api.assetTypes()]).then(
      ([elementTypes, assetTypes]) => setCatalog({ elementTypes, assetTypes }),
      (e) => setError(errorText(e)),
    );
  }, [reload]);

  const children = useMemo(() => {
    const map = new Map<string | null, BuildingNode[]>();
    for (const n of details?.nodes ?? []) map.set(n.parentId, [...(map.get(n.parentId) ?? []), n]);
    return map;
  }, [details]);

  if (error) return <p className="error">{error}</p>;
  if (!details || !catalog) return <p>טוען…</p>;

  const node = selected ? (details.nodes.find((n) => n.id === selected) ?? null) : null;
  const count = (kind: NodeKind) => details.nodes.filter((n) => n.kind === kind).length;
  const safety = details.assets.filter(
    (a) => catalog.assetTypes.find((t) => t.id === a.assetTypeId)?.lifeSafety,
  );

  return (
    <>
      <div className="page-head">
        <h1>{details.building.name}</h1>
        <button className="link" onClick={() => navigate('/')}>
          → לכל הבניינים
        </button>
      </div>
      <div className="stats">
        <span>{count('entrance')} כניסות</span>
        <span>{count('floor')} קומות</span>
        <span>{count('unit')} יחידות</span>
        <span>{count('element')} אלמנטים</span>
        <span>{details.assets.length} פריטי ציוד</span>
        <span className={safety.length ? '' : 'warn'}>
          {safety.length ? `${safety.length} מערכות בטיחות` : 'לא הוזנו מערכות בטיחות'}
        </span>
      </div>
      <div className="split">
        <section className="panel tree-panel">
          <div className={`tree-row root ${selected === null ? 'selected' : ''}`}>
            <button className="tree-label" onClick={() => setSelected(null)}>
              🏢 {details.building.name}
            </button>
          </div>
          <Tree nodes={children} parentId={null} selected={selected} onSelect={setSelected} depth={0} />
        </section>
        <NodePanel
          key={selected ?? 'root'}
          details={details}
          node={node}
          catalog={catalog}
          reload={reload}
          onSelect={setSelected}
        />
      </div>
    </>
  );
}
