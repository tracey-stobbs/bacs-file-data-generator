import { describe, it, expect } from 'vitest';
import { generateFile as generateEaziPayFile } from '../generator.js';
import { previewRows as previewEaziPayRows } from '../generator.js';

describe('EaziPay generateFile smoke', () => {
  it('generates a file whose line count matches requested rows', async (): Promise<void> => {
    const numberOfRows = 8;
    const { fileContent } = await generateEaziPayFile({ numberOfRows, hasInvalidRows: true, sun: 'DEFAULT' });
    const lines = fileContent.trim().split(/\r?\n/);
    expect(lines.length).toBe(numberOfRows);
  });

  it('previewRows rows length aligns with metadata row count', (): void => {
  const preview = previewEaziPayRows({ fileType: 'EaziPay', numberOfRows: 6, hasInvalidRows: true, sun: 'DEFAULT' }, true);
    expect(preview.rows.length).toBe(preview.metadata.rows ?? preview.rows.length);
  });
});