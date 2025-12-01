import { describe, it, expect } from 'vitest';
import { csvQuote, csvParse } from '../../src/lib/utils/csv/csvUtils.js';

describe('csv utils', () => {
  it('round trips simple fields with quoting needs', () => {
    const fields = ['ABC', 'A,B', 'He said "Hi"', 'plain', ''];
    const line = csvQuote(fields);
    const parsed = csvParse(line);
    expect(parsed).toEqual(['ABC', 'A,B', 'He said "Hi"', 'plain', '']);
  });
});
