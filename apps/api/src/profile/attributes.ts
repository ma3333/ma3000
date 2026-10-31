import type { AttributeField, AttributeSchema, Attributes } from '@ma3000/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Field keys are restricted so schemas stay safe to use as JSON keys and form names. */
export const FIELD_KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

export function mergeSchemas(...schemas: (AttributeSchema | undefined)[]): AttributeSchema {
  const byKey = new Map<string, AttributeField>();
  for (const s of schemas) for (const f of s?.fields ?? []) byKey.set(f.key, f);
  return { fields: [...byKey.values()] };
}

/** Checks a schema definition supplied by a tenant. Returns a list of Hebrew error messages (empty = valid). */
export function validateSchema(schema: AttributeSchema): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const f of schema.fields) {
    if (!FIELD_KEY_RE.test(f.key)) errors.push(`מפתח שדה לא תקין: ${f.key}`);
    if (seen.has(f.key)) errors.push(`מפתח שדה כפול: ${f.key}`);
    seen.add(f.key);
    if (!f.label?.trim()) errors.push(`חסרה תווית לשדה ${f.key}`);
    if (f.type === 'select' && !(f.options && f.options.length > 0))
      errors.push(`לשדה בחירה ${f.key} חסרות אפשרויות`);
  }
  return errors;
}

/**
 * Validates and normalises attribute values against a schema. Unknown keys are rejected so data stays consistent
 * with the catalog. Returns the cleaned values or throws with Hebrew messages.
 */
export function validateAttributes(schema: AttributeSchema, input: Record<string, unknown> = {}): Attributes {
  const errors: string[] = [];
  const out: Attributes = {};
  const fields = new Map(schema.fields.map((f) => [f.key, f]));

  for (const key of Object.keys(input)) if (!fields.has(key)) errors.push(`שדה לא מוכר: ${key}`);

  for (const f of schema.fields) {
    const raw = input[f.key];
    if (raw === undefined || raw === null || raw === '') {
      if (f.required) errors.push(`השדה "${f.label}" הוא חובה`);
      continue;
    }
    switch (f.type) {
      case 'text':
        if (typeof raw !== 'string') errors.push(`"${f.label}" חייב להיות טקסט`);
        else out[f.key] = raw.trim();
        break;
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(n)) errors.push(`"${f.label}" חייב להיות מספר`);
        else if (f.min !== undefined && n < f.min) errors.push(`"${f.label}" קטן מהמינימום (${f.min})`);
        else if (f.max !== undefined && n > f.max) errors.push(`"${f.label}" גדול מהמקסימום (${f.max})`);
        else out[f.key] = n;
        break;
      }
      case 'boolean':
        if (typeof raw !== 'boolean') errors.push(`"${f.label}" חייב להיות כן/לא`);
        else out[f.key] = raw;
        break;
      case 'date':
        if (typeof raw !== 'string' || !DATE_RE.test(raw))
          errors.push(`"${f.label}" חייב להיות תאריך (YYYY-MM-DD)`);
        else out[f.key] = raw;
        break;
      case 'select':
        if (typeof raw !== 'string' || !f.options?.includes(raw))
          errors.push(`ערך לא חוקי בשדה "${f.label}"`);
        else out[f.key] = raw;
        break;
    }
  }
  if (errors.length) throw new AttributeValidationError(errors);
  return out;
}

export class AttributeValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('; '));
  }
}
