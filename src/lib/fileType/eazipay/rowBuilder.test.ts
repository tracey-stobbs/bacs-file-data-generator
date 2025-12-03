import { describe, it, expect } from 'vitest';
import { buildEaziPayRows } from './rowBuilder.js';

const makeCtx = (seed = 1): { rng: () => number; now: () => number } => {
  let s = seed >>> 0;
  const rng = (): number => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const now = (): number => 1700000000000;
  return { rng, now };
};

describe('buildEaziPayRows', () => {
  it('builds the requested number of rows deterministically', () => {
    const rowsA = buildEaziPayRows(3, makeCtx(42));
    const rowsB = buildEaziPayRows(3, makeCtx(42));
    expect(rowsA).toEqual(rowsB);
    expect(rowsA).toHaveLength(3);
  });
});
