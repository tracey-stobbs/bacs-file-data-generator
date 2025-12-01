import fs from 'fs';
import path from 'path';

function usage(): void {
  console.error('Usage: normalize-eazipay-dates.ts --file=path');
  process.exit(2);
}

function parseArgs(): { file: string } {
  const opts: { file?: string } = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--file=')) opts.file = a.split('=')[1];
  }
  if (!opts.file) usage();
  return { file: opts.file as string };
}

function normalizeDateToIso(raw: string): string {
  if (!raw) return '';
  const r = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(r)) return r;
  if (/^\d{8}$/.test(r)) return `${r.slice(0, 4)}-${r.slice(4, 6)}-${r.slice(6, 8)}`;
  const m = r.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = r.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return r;
}

void (function main(): void {
  const opts = parseArgs();
  const file = path.resolve(opts.file);
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(3);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (!line || !line.trim()) {
      out.push(line);
      continue;
    }
    const cols = line.split(',');
    // EaziPay format: processing date is at index 8
    if (cols.length >= 9) {
      cols[8] = normalizeDateToIso(cols[8]);
    }
    out.push(cols.join(','));
  }
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log('Normalized dates to YYYY-MM-DD in', file);
})();
