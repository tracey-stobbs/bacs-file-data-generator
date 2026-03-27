// Centralised seeding helper to ensure deterministic faker behaviour when requested.
// Call ensureSeeded() early in any path that uses @faker-js/faker.
import { faker } from '@faker-js/faker';

export function ensureSeeded(): void {
  const env = process.env.FAKER_SEED;
  if (env !== undefined && env !== '') {
    const n = Number(env);
    if (Number.isNaN(n)) {
      throw new Error(`FAKER_SEED must be a number, got "${env}"`);
    }
    // faker.seed accepts a 32-bit integer. Coerce to integer.
    faker.seed(n);
  }
}

export default ensureSeeded;
