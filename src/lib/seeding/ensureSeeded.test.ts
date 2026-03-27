import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ensureSeeded } from './ensureSeeded.js';
import { AppError } from '../errors/AppError.js';

describe('ensureSeeded', () => {
  const prev = process.env.FAKER_SEED;

  beforeEach(() => {
    delete process.env.FAKER_SEED;
  });

  afterEach(() => {
    if (prev !== undefined) process.env.FAKER_SEED = prev;
    else delete process.env.FAKER_SEED;
  });

  it('returns undefined when no seed provided', () => {
    const result = ensureSeeded();
    expect(result).toBeUndefined();
  });

  it('uses env seed when provided', () => {
    process.env.FAKER_SEED = '1234';
    const result = ensureSeeded();
    expect(result).toBe(1234);
  });

  it('throws AppError for invalid seed', () => {
    process.env.FAKER_SEED = 'abc';
    expect(() => ensureSeeded()).toThrow(AppError);
  });
});
