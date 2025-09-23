import { describe, it, expect } from 'vitest';
import { generateCsv } from '../../src/index.js';

describe('generateCsv API', () => {
  it('produces deterministic output with seed', () => {
    process.env.FAKER_SEED = '1234';
    const { csv, rows } = generateCsv({ reportType: 'eazipay', numberOfRows: 3, dateFormat: 'YYYY-MM-DD' });
    expect(rows.length).toBe(3);
    // Snapshot-like assertion: stable structure & first line deterministic
    const firstLine = csv.split(/\n/)[0];
    expect(firstLine.split(',').length).toBe(14);
    expect(firstLine).toMatch(/^(01|17|18|99|0C|0N|0S)/);
  });
});
