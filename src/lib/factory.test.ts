import { describe, it, expect } from 'vitest';
import { generateFile, previewRows } from './factory.js';

describe('factory', () => {
  it('routes EaziPay generateFile', async () => {
    const res = await generateFile({ fileType: 'EaziPay', numberOfRows: 1 });
    expect(typeof res.fileContent).toBe('string');
  });

  it('routes EaziPay previewRows', async () => {
    const res = await previewRows({ fileType: 'EaziPay', numberOfRows: 1 });
    expect(res.headers.length).toBeGreaterThan(0);
  });

  it('routes Bacs18PaymentLines previewRows', async () => {
    const res = await previewRows({
      fileType: 'Bacs18PaymentLines',
      numberOfRows: 1,
      originating: { sortCode: '123456', accountNumber: '12345678', accountName: 'Test' },
    } as any);
    expect(res.headers.length).toBeGreaterThan(0);
  });

  it('routes Bacs18PaymentLines generateFile', async () => {
    const res = await generateFile({
      fileType: 'Bacs18PaymentLines',
      numberOfRows: 2,
      originating: { sortCode: '123456', accountNumber: '12345678', accountName: 'Test' },
    } as any);
    expect(typeof res.fileContent).toBe('string');
  });

  it('routes SDDirect previewRows', async () => {
    const res = await previewRows({ fileType: 'SDDirect', numberOfRows: 1 } as any);
    expect(res.headers.length).toBeGreaterThan(0);
  });

  it('routes SDDirect generateFile', async () => {
    const res = await generateFile({ fileType: 'SDDirect', numberOfRows: 2 } as any);
    expect(typeof res.fileContent).toBe('string');
  });

  it('throws for unsupported file type', async () => {
    await expect(
      // @ts-expect-error forcing unsupported type for test
      generateFile({ fileType: 'UnknownType', numberOfRows: 1 })
    ).rejects.toHaveProperty('code', 'UNSUPPORTED_FILE_TYPE');
  });
});
