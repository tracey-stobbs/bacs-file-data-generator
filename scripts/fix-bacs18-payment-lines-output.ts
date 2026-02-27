import fs from 'node:fs/promises';
import path from 'node:path';

type RowResult = {
  originalLength: number;
  finalLength: number;
  txCodeBefore: string;
  txCodeAfter: string;
  amountBefore: string;
  amountAfter: string;
};

function replaceSlice(input: string, start: number, endExclusive: number, replacement: string): string {
  return input.slice(0, start) + replacement + input.slice(endExclusive);
}

function normalizeToLength(input: string, length: number): string {
  if (input.length === length) return input;
  if (input.length > length) return input.slice(0, length);
  return input.padEnd(length, ' ');
}

function chooseTxCode(originalAmount: number): '17' | '18' | '99' {
  const selector = Math.abs(originalAmount) % 3;
  if (selector === 0) return '17';
  if (selector === 1) return '18';
  return '99';
}

function parseFixedDigits(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFixedDigits(value: number, width: number): string {
  const clamped = Math.max(0, Math.floor(value));
  const str = String(clamped);
  if (str.length > width) {
    // If it overflows, keep the right-most digits to preserve fixed width.
    return str.slice(-width);
  }
  return str.padStart(width, '0');
}

function transformRow(originalRow: string): RowResult & { row: string } {
  const originalLength = originalRow.length;

  // Work on a fixed-width copy so column positions are stable.
  let row = normalizeToLength(originalRow, 106);

  const txCodeBefore = row.slice(15, 17);
  const amountBefore = row.slice(35, 46);

  const amountNumericBefore = parseFixedDigits(amountBefore) ?? 0;

  let txCodeAfter = txCodeBefore;
  if (row.charAt(15) === '0') {
    txCodeAfter = chooseTxCode(amountNumericBefore);
    row = replaceSlice(row, 15, 17, txCodeAfter);
  }

  const multiple = txCodeAfter === '99' ? 50 : 100;
  const amountNumeric = parseFixedDigits(amountBefore) ?? 0;
  const adjustedAmount = Math.floor(amountNumeric / multiple) * multiple;
  const amountAfter = formatFixedDigits(adjustedAmount, 11);
  row = replaceSlice(row, 35, 46, amountAfter);

  // Columns 102-106 (1-based) => indexes 101-106 (0-based, endExclusive=106)
  row = replaceSlice(row, 101, 106, '26058');

  row = normalizeToLength(row, 106);

  return {
    row,
    originalLength,
    finalLength: row.length,
    txCodeBefore,
    txCodeAfter,
    amountBefore,
    amountAfter,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dirArg = args.find((a) => a.startsWith('--dir='));
  const dir = dirArg ? dirArg.slice('--dir='.length) : 'output/file-data-generator/Bacs18PaymentLines';

  const absoluteDir = path.resolve(process.cwd(), dir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && /^TMS-.*\.txt$/i.test(e.name))
    .map((e) => path.join(absoluteDir, e.name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No TMS-*.txt files found in: ${absoluteDir}`);
  }

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const rawLines = content.split(/\r?\n/);

    // If the file ends with a newline, split() yields a trailing empty string.
    const hasTrailingNewline = rawLines.length > 0 && rawLines[rawLines.length - 1] === '';
    const lines = hasTrailingNewline ? rawLines.slice(0, -1) : rawLines;

    let txChanged = 0;
    let amtChanged = 0;
    let rows99 = 0;
    let badFinalLen = 0;

    const transformed = lines.map((line) => {
      const res = transformRow(line);
      if (res.txCodeBefore !== res.txCodeAfter) txChanged++;
      if (res.amountBefore !== res.amountAfter) amtChanged++;
      if (res.txCodeAfter === '99') rows99++;
      if (res.finalLength !== 106) badFinalLen++;
      return res.row;
    });

    const newContent = transformed.join(eol) + (hasTrailingNewline ? eol : '');
    await fs.writeFile(filePath, newContent, 'utf8');

    const fileName = path.basename(filePath);
    // eslint-disable-next-line no-console
    console.log(
      `${fileName}: rows=${lines.length} txChanged=${txChanged} amtChanged=${amtChanged} tx99=${rows99} badFinalLen=${badFinalLen}`,
    );
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
