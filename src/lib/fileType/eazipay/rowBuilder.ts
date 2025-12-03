import type { DeterminismContext } from '../../determinism/context.js';
import type { EaziPaySimpleRow } from './types.js';
import { buildSeededGenerators } from './seeding.js';

export function buildEaziPayRows(count: number, ctx: DeterminismContext): EaziPaySimpleRow[] {
  const seeded = buildSeededGenerators(ctx);
  const rows: EaziPaySimpleRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const amountPence = seeded.nextAmountPence();
    const reference = seeded.nextReference();
    // Fixed demo data for bank details to keep scope minimal; can be extended later
    rows.push({
      accountName: 'Demo Account',
      accountNumber: '12345678',
      sortCode: '12-34-56',
      amountPence,
      reference,
    });
  }
  return rows;
}
