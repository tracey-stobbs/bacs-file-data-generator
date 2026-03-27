import type { EaziPaySimpleRow, EaziPayFormatOptions } from './types.js';

export function formatRowsToCsv(
  rows: ReadonlyArray<EaziPaySimpleRow>,
  options: EaziPayFormatOptions
): string {
  const delimiter = options.delimiter;
  const header = options.header
    ? `accountName${delimiter}accountNumber${delimiter}sortCode${delimiter}amountPence${delimiter}reference\n`
    : '';
  const body = rows
    .map((r) =>
      [r.accountName, r.accountNumber, r.sortCode, String(r.amountPence), r.reference].join(
        delimiter
      )
    )
    .join('\n');
  return header + body + (body ? '\n' : '');
}
