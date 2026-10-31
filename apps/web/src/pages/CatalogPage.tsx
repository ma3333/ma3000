import type { AssetType, AttributeField, AttributeFieldType } from '@ma3000/shared';
import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../api';
import { CATEGORY } from '../labels';

const FIELD_TYPES: Record<AttributeFieldType, string> = {
  text: 'טקסט',
  number: 'מספר',
  boolean: 'כן/לא',
  date: 'תאריך',
  select: 'רשימה',
};

type DraftField = AttributeField & { optionsText: string };
const emptyField = (): DraftField => ({ key: '', label: '', type: 'text', optionsText: '' });

/** Equipment catalog: platform types plus the tenant's own types or extensions of existing types (docs/18 §18.3). */
export function CatalogPage() {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'new' | 'extend' | null>(null);
  const [baseTypeId, setBaseTypeId] = useState('');
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetType['category']>('other');
  const [fields, setFields] = useState<DraftField[]>([emptyField()]);

  const load = useCallback(() => api.assetTypes().then(setTypes, (e) => setError(errorText(e))), []);
  useEffect(() => void load(), [load]);

  const updateField = (i: number, patch: Partial<DraftField>) =>
    setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const submit = async () => {
    const base = types.find((t) => t.id === baseTypeId);
    try {
      await api.createAssetType({
        key,
        name,
        category: mode === 'extend' && base ? base.category : category,
        baseTypeId: mode === 'extend' ? baseTypeId : undefined,
        fields: fields
          .filter((f) => f.key || f.label)
          .map(({ optionsText, ...f }) => ({
            ...f,
            options:
              f.type === 'select'
                ? optionsText
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean)
                : undefined,
          })),
      });
      setMode(null);
      setKey('');
      setName('');
      setFields([emptyField()]);
      setError('');
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>קטלוג ציוד ומערכות</h1>
        <div className="actions">
          <button className="secondary" onClick={() => setMode('new')}>
            + סוג ציוד חדש
          </button>
          <button className="secondary" onClick={() => setMode('extend')}>
            + הוספת שדות לסוג קיים
          </button>
        </div>
      </div>

      {mode && (
        <section className="card">
          <h2>{mode === 'new' ? 'סוג ציוד חדש' : 'הרחבת סוג קיים'}</h2>
          <div className="attr-grid">
            {mode === 'extend' && (
              <label>
                סוג בסיס
                <select
                  value={baseTypeId}
                  onChange={(e) => {
                    setBaseTypeId(e.target.value);
                    const base = types.find((t) => t.id === e.target.value);
                    if (base) {
                      setName(`${base.name} (מורחב)`);
                      setKey(`${base.key}_ext`);
                    }
                  }}
                >
                  <option value="">בחר…</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              שם
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              מפתח (באנגלית)
              <input dir="ltr" value={key} onChange={(e) => setKey(e.target.value)} placeholder="pool_pump" />
            </label>
            {mode === 'new' && (
              <label>
                קטגוריה
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetType['category'])}
                >
                  {Object.entries(CATEGORY).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <h3>שדות</h3>
          {fields.map((f, i) => (
            <div key={i} className="field-row">
              <input
                placeholder="תווית (עברית)"
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
              />
              <input
                dir="ltr"
                placeholder="key"
                value={f.key}
                onChange={(e) => updateField(i, { key: e.target.value })}
              />
              <select
                value={f.type}
                onChange={(e) => updateField(i, { type: e.target.value as AttributeFieldType })}
              >
                {Object.entries(FIELD_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {f.type === 'select' && (
                <input
                  placeholder="אפשרויות, מופרדות בפסיק"
                  value={f.optionsText}
                  onChange={(e) => updateField(i, { optionsText: e.target.value })}
                />
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) => updateField(i, { required: e.target.checked })}
                />{' '}
                חובה
              </label>
            </div>
          ))}
          <button className="link" onClick={() => setFields([...fields, emptyField()])}>
            + שדה נוסף
          </button>
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button
              onClick={submit}
              disabled={!name.trim() || !key.trim() || (mode === 'extend' && !baseTypeId)}
            >
              שמור
            </button>
            <button className="link" onClick={() => setMode(null)}>
              ביטול
            </button>
          </div>
        </section>
      )}

      {Object.entries(CATEGORY).map(([cat, label]) => {
        const list = types.filter((t) => t.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="card">
            <h2>{label}</h2>
            <ul className="asset-list">
              {list.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.name}</strong>
                    {!t.platform && <span className="badge">שלנו</span>}
                    {t.lifeSafety && <span className="badge badge-safety">בטיחות חיים</span>}
                    {t.baseTypeId && (
                      <span className="muted small">
                        {' '}
                        · מורחב מ-{types.find((b) => b.id === t.baseTypeId)?.name}
                      </span>
                    )}
                    <div className="muted small">
                      {t.attributeSchema.fields.map((f) => f.label).join(' · ') || 'ללא שדות'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
