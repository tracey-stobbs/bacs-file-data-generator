import { describe, it, expect } from 'vitest';
import { formatRowsToCsv } from './formatting.js';

describe('formatRowsToCsv', () => {
  it('renders header and rows with delimiter', () => {
    const csv = formatRowsToCsv(
      [
        {
          accountName: 'A',
          accountNumber: '1111',
          sortCode: '11-11-11',
          amountPence: 123,
          reference: 'REF-1',
        },
        {
          accountName: 'B',
          accountNumber: '2222',
          sortCode: '22-22-22',
          amountPence: 456,
          reference: 'REF-2',
        },
      ],
      { delimiter: ',', header: true }
    );
    expect(csv).toBe(
      'accountName,accountNumber,sortCode,amountPence,reference\n' +
        'A,1111,11-11-11,123,REF-1\n' +
        'B,2222,22-22-22,456,REF-2\n'
    );
  });
  it('omits header when disabled', () => {
    const csv = formatRowsToCsv([], { delimiter: ',', header: false });
    expect(csv).toBe('');
  });
});
