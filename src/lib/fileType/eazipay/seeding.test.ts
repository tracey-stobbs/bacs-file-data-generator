import { describe, it, expect } from 'vitest';
import { buildSeededGenerators } from './seeding.js';

const makeCtx = (seed = 1): { rng: () => number; now: () => number } => {
  // Simple LCG compatible with our DeterminismContext contract
  let s = seed >>> 0;
  const rng = (): number => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const now = (): number => 1700000000000; // fixed timestamp
  return { rng, now };
};

describe('buildSeededGenerators', () => {
  it('produces deterministic values for a given seed', () => {
    const genA = buildSeededGenerators(makeCtx(1234));
    const genB = buildSeededGenerators(makeCtx(1234));
    expect(genA.nextAmountPence()).toEqual(genB.nextAmountPence());
    expect(genA.nextReference()).toEqual(genB.nextReference());
  });
  it('different seeds produce different sequences', () => {
    const genA = buildSeededGenerators(makeCtx(1234));
    const genB = buildSeededGenerators(makeCtx(5678));
    expect(genA.nextReference()).not.toEqual(genB.nextReference());
  });
});
