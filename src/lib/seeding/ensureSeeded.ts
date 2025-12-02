import { faker } from '@faker-js/faker';
import { AppError } from '../errors/AppError.js';

export interface SeedOptions {
  seed?: number;
}

export function ensureSeeded(opts?: SeedOptions): number | undefined {
  const explicit = typeof opts?.seed === 'number' ? opts?.seed : undefined;
  const env = process.env.FAKER_SEED;
  const value = explicit ?? (env !== undefined && env !== '' ? Number(env) : undefined);

  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) {
    throw new AppError('INVALID_SEED', `FAKER_SEED must be a finite number, got "${env}"`, 400, { envValue: env });
  }
  // faker.seed accepts a 32-bit integer
  faker.seed(value);
  return value;
}

export default ensureSeeded;
