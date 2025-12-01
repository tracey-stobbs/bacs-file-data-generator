import { describe, it, expect } from 'vitest';
import { generateEaziPayRowsConstrainedWithMeta } from '../src/lib/fileType/eazipay/generator.js';

describe('EaziPay generator originating', () => {
  it('uses originating sortCode and accountNumber when supplied', () => {
    const params = {
      numberOfRows: 5,
      originating: {
        sortCode: '912291',
        accountNumber: '51491194',
        accountName: 'hOLDER-2W2',
        sunNumber: '797154',
        sunName: 'SUN-C-0QZ5A',
      },
    } as any;
    const res = generateEaziPayRowsConstrainedWithMeta(params);
    expect(res.metadata.originating.sortCode).toBe('912291');
    expect(res.metadata.originating.accountNumber).toBe('51491194');
    // Also validate CSV row columns are patched
    for (const row of res.rows) {
      expect(row[1]).toBe('912291');
      expect(row[2]).toBe('51491194');
    }
  });
});
