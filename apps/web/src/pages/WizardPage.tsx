import type { BuildingType, BuildingWizardInput, ElementType } from '@ma3000/shared';
import { FormEvent, useEffect, useState } from 'react';
import { api, errorText } from '../api';
import { BUILDING_TYPE } from '../labels';
import { navigate } from '../router';

const DEFAULT_ELEMENTS = ['lobby'];

/** New-building wizard (docs/18 §18.8): a few questions generate the building tree. */
export function WizardPage() {
  const [elementTypes, setElementTypes] = useState<ElementType[]>([]);
  const [form, setForm] = useState({
    name: '',
    type: 'residential' as BuildingType,
    city: '',
    address: '',
    yearBuilt: '',
    entrances: 1,
    floorsAbove: 4,
    floorsBelow: 0,
    unitsPerFloor: 2,
  });
  const [elements, setElements] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The lobby is created automatically on the ground floor.
    api.elementTypes().then(
      (t) => setElementTypes(t.filter((e) => !DEFAULT_ELEMENTS.includes(e.key))),
      (e) => setError(errorText(e)),
    );
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  const toggle = (key: string) =>
    setElements(elements.includes(key) ? elements.filter((k) => k !== key) : [...elements, key]);
  const units = form.entrances * form.floorsAbove * form.unitsPerFloor;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const input: BuildingWizardInput = {
      name: form.name,
      type: form.type,
      city: form.city || undefined,
      address: form.address || undefined,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
      entrances: form.entrances,
      floorsAbove: form.floorsAbove,
      floorsBelow: form.floorsBelow,
      unitsPerFloor: form.unitsPerFloor,
      elements,
    };
    try {
      const created = await api.createBuilding(input);
      navigate(`/b/${created.building.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const num = (
    key: 'entrances' | 'floorsAbove' | 'floorsBelow' | 'unitsPerFloor',
    label: string,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={form[key]}
        onChange={(e) => set(key, Number(e.target.value))}
        required
      />
    </label>
  );

  return (
    <form className="card wizard" onSubmit={submit}>
      <h1>הקמת בניין חדש</h1>

      <fieldset>
        <legend>פרטי הבניין</legend>
        <div className="attr-grid">
          <label>
            שם הבניין *
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              placeholder="לדוגמה: הרצל 10"
            />
          </label>
          <label>
            סוג
            <select value={form.type} onChange={(e) => set('type', e.target.value as BuildingType)}>
              {Object.entries(BUILDING_TYPE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            עיר
            <input value={form.city} onChange={(e) => set('city', e.target.value)} />
          </label>
          <label>
            כתובת
            <input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </label>
          <label>
            שנת בנייה
            <input
              type="number"
              min={1800}
              max={2100}
              value={form.yearBuilt}
              onChange={(e) => set('yearBuilt', e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>מבנה</legend>
        <div className="attr-grid">
          {num('entrances', 'מספר כניסות', 1, 20)}
          {num('floorsAbove', 'קומות מעל הקרקע', 0, 120)}
          {num('floorsBelow', 'קומות מתחת לקרקע', 0, 10)}
          {num('unitsPerFloor', form.type === 'office' ? 'משרדים בקומה' : 'דירות בקומה', 0, 50)}
        </div>
        <p className="muted">
          ייווצרו {units} {form.type === 'office' ? 'משרדים' : 'דירות'}, וקומת קרקע עם לובי בכל כניסה. אפשר
          לשנות הכול אחר כך.
        </p>
      </fieldset>

      <fieldset>
        <legend>אלמנטים בבניין</legend>
        <div className="chips">
          {elementTypes.map((t) => (
            <label key={t.key} className={`chip ${elements.includes(t.key) ? 'chip-on' : ''}`}>
              <input type="checkbox" checked={elements.includes(t.key)} onChange={() => toggle(t.key)} />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={busy || !form.name.trim()}>
          {busy ? 'יוצר…' : 'צור בניין'}
        </button>
        <a className="link" href="#/">
          ביטול
        </a>
      </div>
    </form>
  );
}
