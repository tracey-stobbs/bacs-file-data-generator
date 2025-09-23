import { generateEaziPayRowsConstrained, generateEaziPayRowsConstrainedWithMeta } from './fileType/eazipay/index.js';
import { csvQuote } from './utils/csv/csvUtils.js';

export interface GenerateCsvOptions {
  reportType: 'eazipay'; // future: extend to other types
  numberOfRows?: number;
  allowedTransactionCodes?: string[];
  dateFormat?: string;
  originating?: { sortCode?: string; accountNumber?: string; accountName?: string };
}

export function generateCsv(options: GenerateCsvOptions): { rows: string[][]; csv: string } {
  switch (options.reportType) {
    case 'eazipay': {
      const result = generateEaziPayRowsConstrainedWithMeta({
        numberOfRows: options.numberOfRows,
        allowedTransactionCodes: options.allowedTransactionCodes,
        dateFormat: options.dateFormat,
        originating: options.originating as any,
      });
      const csv = (result.rows as string[][]).map((r: string[]) => csvQuote(r)).join('\n');
      return { rows: result.rows as string[][], csv } as { rows: string[][]; csv: string };
    }
    default:
      throw new Error(`Unsupported report type: ${options.reportType}`);
  }
}