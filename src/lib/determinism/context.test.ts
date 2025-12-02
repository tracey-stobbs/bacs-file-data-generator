import { describe, it, expect } from 'vitest';
import { makeRng, makeClock, createDeterminismContext } from './context.js';

describe('DeterminismContext', () => {
  it('makeRng produces deterministic sequence for same seed', () => {
    const r1 = makeRng(1234);
    const r2 = makeRng(1234);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
  });

  it('makeClock returns fixed when provided', () => {
    const fixed = 1733011200000;
    const clk = makeClock(fixed);
    expect(clk()).toBe(fixed);
  });

  it('createDeterminismContext wires rng and now', () => {
    const ctx = createDeterminismContext(1, 2);
    expect(typeof ctx.rng).toBe('function');
    expect(typeof ctx.now).toBe('function');
    expect(ctx.now()).toBe(2);
  });
});
