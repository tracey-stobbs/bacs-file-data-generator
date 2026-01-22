import type { DeterminismContext } from '../../determinism/context.js';

// Creates deterministic fake references and amounts using provided rng
export function buildSeededGenerators(ctx: DeterminismContext): {
  nextInt: (min: number, max: number) => number;
  nextPick: <T>(items: ReadonlyArray<T>) => T;
  nextAmountPence: () => number;
  nextReference: () => string;
} {
  const nextInt = (min: number, max: number): number => {
    const r = ctx.rng();
    return Math.floor(r * (max - min + 1)) + min;
  };

  const nextPick = <T>(items: ReadonlyArray<T>): T => {
    const idx = nextInt(0, items.length - 1);
    return items[idx];
  };

  return {
    nextInt,
    nextPick,
    nextAmountPence: (): number => nextInt(100, 50_000),
    nextReference: (): string => {
      const prefixes = ['INV', 'REF', 'PAY', 'DD'] as const;
      const prefix = nextPick(prefixes);
      const num = nextInt(10000, 99999);
      return `${prefix}-${num}`;
    },
  };
}
