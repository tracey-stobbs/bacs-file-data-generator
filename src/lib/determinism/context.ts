export interface DeterminismContext {
  rng: () => number;
  now: () => number;
}

// Lightweight LCG for deterministic RNG in [0,1)
export function makeRng(seed: number): () => number {
  // Validate and normalize seed to 32-bit unsigned
  let state = (seed >>> 0) || 1;
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  return () => {
    state = (a * state + c) % m;
    // Return in [0,1)
    return state / m;
  };
}

export function makeClock(envFixedTimestamp?: number): () => number {
  if (typeof envFixedTimestamp === 'number' && Number.isFinite(envFixedTimestamp)) {
    const fixed = envFixedTimestamp;
    return () => fixed;
  }
  return () => Date.now();
}

export function createDeterminismContext(seed: number, fixedTimestamp?: number): DeterminismContext {
  const rng = makeRng(seed);
  const now = makeClock(fixedTimestamp);
  return { rng, now };
}
