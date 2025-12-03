import { describe, it, expect } from 'vitest';
import { validateEaziPayInput } from './validation.js';

describe('validateEaziPayInput', () => {
  it('accepts positive integer rows', () => {
    const res = validateEaziPayInput({ rows: 5 });
    expect(res.isValid).toBe(true);
  });
  it('rejects non-positive rows', () => {
    expect(validateEaziPayInput({ rows: 0 }).isValid).toBe(false);
    expect(validateEaziPayInput({ rows: -1 }).isValid).toBe(false);
  });
  it('rejects non-integer rows', () => {
    // @ts-expect-error force wrong type
    const res = validateEaziPayInput({ rows: 1.2 });
    expect(res.isValid).toBe(false);
  });
});
