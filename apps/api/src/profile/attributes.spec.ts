import { describe, expect, it } from 'vitest';
import { AttributeValidationError, mergeSchemas, validateAttributes, validateSchema } from './attributes';

const schema = {
  fields: [
    { key: 'stops', label: 'מספר תחנות', type: 'number' as const, min: 2, required: true },
    { key: 'shabbat', label: 'מעלית שבת', type: 'boolean' as const },
    { key: 'fuel', label: 'דלק', type: 'select' as const, options: ['סולר', 'גז'] },
    { key: 'checked', label: 'בדיקה', type: 'date' as const },
  ],
};

describe('validateAttributes', () => {
  it('normalises valid values and coerces numeric strings', () => {
    expect(
      validateAttributes(schema, { stops: '8', shabbat: true, fuel: 'גז', checked: '2026-01-31' }),
    ).toEqual({
      stops: 8,
      shabbat: true,
      fuel: 'גז',
      checked: '2026-01-31',
    });
  });

  it('collects every error, including unknown keys and missing required fields', () => {
    try {
      validateAttributes(schema, { stops: 1, fuel: 'חשמל', extra: 'x' });
      expect.unreachable();
    } catch (e) {
      const errors = (e as AttributeValidationError).errors;
      expect(errors).toContain('שדה לא מוכר: extra');
      expect(errors.some((m) => m.includes('מינימום'))).toBe(true);
      expect(errors.some((m) => m.includes('דלק'))).toBe(true);
    }
    expect(() => validateAttributes(schema, {})).toThrow(/חובה/);
  });
});

describe('schemas', () => {
  it('merges base and extension fields, extension wins on the same key', () => {
    const merged = mergeSchemas(schema, {
      fields: [
        { key: 'stops', label: 'תחנות', type: 'number' },
        { key: 'pit', label: 'בור', type: 'boolean' },
      ],
    });
    expect(merged.fields.map((f) => f.key)).toEqual(['stops', 'shabbat', 'fuel', 'checked', 'pit']);
    expect(merged.fields[0].label).toBe('תחנות');
  });

  it('rejects bad tenant-defined schemas', () => {
    expect(validateSchema({ fields: [{ key: 'Bad Key', label: '', type: 'select' }] })).toHaveLength(3);
    expect(validateSchema(schema)).toEqual([]);
  });
});
