import { describe, it, expect, beforeEach } from 'vitest';
import { generateFile } from '../src/lib/factory.js';

describe.skip('EaziPay SUN Name propagation (legacy - writes to FS; replaced by HTTP tests)', () => {
  const sunName = 'SUN-C-0QZ5A';
  const originating = {
    sortCode: '912291',
    accountNumber: '51491194',
    accountName: 'hOLDER-2W2',
    sunNumber: '797154',
    sunName,
  };

  beforeEach(() => {
    // Deterministic generation across runs
    process.env.FAKER_SEED = '1234';
  });

  it('sets column 11 (SUN Name) to supplied originating.sunName for all rows', async () => {
    const res = await generateFile({ fileType: 'EaziPay', numberOfRows: 5, originating });
    const lines = String(res.fileContent)
      .split(/\r?\n/)
      .filter((l) => l.length > 0);
    expect(lines.length).toBe(5);
    for (const line of lines) {
      const fields = line.split(',');
      // Ensure minimum columns
      expect(fields.length).toBeGreaterThanOrEqual(11);
      expect(fields[10]).toBe(sunName);
    }
  });
});
