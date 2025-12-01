import { describe, it, expect } from 'vitest';
import { sanitizeAccountName } from '../../src/lib/fileType/eazipay/generator.js';

describe('sanitizeAccountName', () => {
  it('removes non-ASCII and control characters, quotes and commas', () => {
    const input = 'Acme\u0007Co "Ltd", \u2603 Snowman\u00A0';
    const out = sanitizeAccountName(input);
    // Should remove the bell (0x07), quotes, comma, non-ASCII snowman and NBSP
    expect(out).toBe('AcmeCo Ltd Snowman');
  });
});
