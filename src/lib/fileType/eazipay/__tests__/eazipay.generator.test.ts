import { describe, it, expect } from 'vitest';
import { generateValidEaziPayRow, eaziPayAdapter, formatEaziPayRowAsArray } from '../generator.js';
import { EaziPayValidator } from '../../../validators/eazipayValidator.js';

function buildOriginating(): {
  sortCode: string;
  accountNumber: string;
  accountName: string;
} {
  return {
    sortCode: '123456',
    accountNumber: '12345678',
    accountName: 'ORIGIN NAME',
  };
}

describe('EaziPay generator', () => {
  it('generates a valid row with required fields', (): void => {
    const row = generateValidEaziPayRow({ originating: buildOriginating() }, 'YYYY-MM-DD');
    const arr = formatEaziPayRowAsArray(row);
    expect(arr).toHaveLength(EaziPayValidator.getColumnCount());
    expect(row.fixedZero).toBe(0);
    expect(typeof row.amount).toBe('number');
    expect(row.processingDate).toMatch(/^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{8}$/);
  });

  it('can generate some invalid rows when requested', (): void => {
    const rows = eaziPayAdapter.buildPreviewRows({
      numberOfRows: 10,
      hasInvalidRows: true,
      originating: buildOriginating(),
    });
    const maybeInvalidSlice = rows.slice(1, 6);
    const invalidDetected = maybeInvalidSlice.filter(
      (r) => /[A-Za-z]/.test(r[3]) || r[7].startsWith('-') || r[0] === 'XX'
    );
    expect(invalidDetected.length).toBeGreaterThan(0);
  });

  it('preview meta reports expected columns and validity flag', (): void => {
    const rows = eaziPayAdapter.buildPreviewRows({
      numberOfRows: 6,
      hasInvalidRows: true,
      originating: buildOriginating(),
      sun: 'DEFAULT',
    });
    const meta = eaziPayAdapter.previewMeta(rows, {
      hasInvalidRows: true,
      sun: 'DEFAULT',
    });
    expect(meta.columns).toBe(EaziPayValidator.getColumnCount());
    expect(meta.validity).toBe('I');
    expect(meta.fileType).toBe('EaziPay');
  });
});
