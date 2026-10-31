import type { AttributeSchema, Attributes } from '@ma3000/shared';

interface Props {
  schema: AttributeSchema;
  values: Attributes;
  onChange: (values: Attributes) => void;
}

/** Renders inputs for a catalog attribute schema (docs/18): text, number, yes/no, date and select fields. */
export function AttributeForm({ schema, values, onChange }: Props) {
  if (!schema.fields.length) return null;
  const set = (key: string, value: string | number | boolean | null) => onChange({ ...values, [key]: value });

  return (
    <div className="attr-grid">
      {schema.fields.map((f) => {
        const v = values[f.key];
        const label = `${f.label}${f.required ? ' *' : ''}`;
        if (f.type === 'boolean') {
          return (
            <label key={f.key} className="check">
              <input type="checkbox" checked={v === true} onChange={(e) => set(f.key, e.target.checked)} />{' '}
              {label}
            </label>
          );
        }
        return (
          <label key={f.key}>
            {label}
            {f.type === 'select' ? (
              <select value={(v as string) ?? ''} onChange={(e) => set(f.key, e.target.value || null)}>
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={(v as string | number) ?? ''}
                min={f.min}
                max={f.max}
                onChange={(e) =>
                  set(
                    f.key,
                    e.target.value === ''
                      ? null
                      : f.type === 'number'
                        ? Number(e.target.value)
                        : e.target.value,
                  )
                }
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

/** Drops empty values so optional fields are not sent. */
export const compact = (values: Attributes) =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== ''));
