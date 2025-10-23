import fs from 'fs';
import path from 'path';

function usage() {
  console.error('Usage: prepare-ddica-csv.ts --srcCsv=path --outCsv=path [--metadata=path]');
  process.exit(2);
}

function parseArgs() {
  const opts: any = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--srcCsv=')) opts.srcCsv = a.split('=')[1];
    else if (a.startsWith('--outCsv=')) opts.outCsv = a.split('=')[1];
    else if (a.startsWith('--metadata=')) opts.metadata = a.split('=')[1];
  }
  if (!opts.srcCsv || !opts.outCsv) usage();
  return opts;
}

function sanitizeAccountName(name: string): string {
  if (!name) return '';
  return name.replace(/[\x00-\x1F\x7F]/g, '').replace(/[",]+/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeDateToIso(raw: string): string {
  // Accept DD/MM/YYYY or YYYY-MM-DD, possibly with slashes
  if (!raw) return '';
  const r = raw.trim();
  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}$/.test(r)) return r;
  // DD/MM/YYYY
  const m = r.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  // Try other common formats: DD-MM-YYYY
  const m2 = r.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) {
    const dd = m2[1].padStart(2, '0');
    const mm = m2[2].padStart(2, '0');
    const yyyy = m2[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  // Fallback: return original to preserve content
  return r;
}

function addDaysIso(iso: string, add: number): string {
  // iso must be YYYY-MM-DD
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + add);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

(function main(){
  const opts = parseArgs();
  const src = opts.srcCsv;
  const out = opts.outCsv;
  if (!fs.existsSync(src)) {
    console.error('Source CSV not found:', src);
    process.exit(3);
  }
  const content = fs.readFileSync(src, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    console.error('Source CSV is empty');
    process.exit(4);
  }
  // Parse rows (generator produces simple unquoted CSV)
  const rows = lines.map(l => l.split(','));
  // Column indexes according to generator format:
  // 0 txn,1 originatingSortCode,2 originatingAccountNumber,3 destSortCode,4 destAccountNumber,5 destAccountName,6 fixedZero,7 amount,8 processingDate,...
  const DEBIT_CODES = new Set(['17','18','19']);
  const debitRows = rows.filter(r => DEBIT_CODES.has((r[0]||'').trim()));
  if (debitRows.length === 0) {
    console.error('No debit rows (17/18/19) found in source CSV');
    process.exit(5);
  }
  // Normalize dates and sanitize fields
  const normalized = debitRows.map(r => {
    const copy = r.slice();
    copy[5] = sanitizeAccountName(String(copy[5] || '')).slice(0, 18);
    copy[10] = sanitizeAccountName(String(copy[10] || '')).slice(0, 18); // SUN Name
    copy[8] = normalizeDateToIso(String(copy[8] || ''));
    // ensure amount is integer-like (no currency symbols)
    copy[7] = String(Number(String(copy[7] || '0').replace(/[^0-9.-]+/g,'')) || 0);
    return copy;
  });

  // Group by destination account (sort+acct) to find duplicates
  const groupKey = (r: string[]) => `${(r[3]||'').trim()}|${(r[4]||'').trim()}`;
  const groups: Record<string, string[][]> = {};
  for (const r of normalized) {
    const k = groupKey(r);
    groups[k] = groups[k] || [];
    groups[k].push(r);
  }
  // If no group has >=2 rows, pick first debit row and clone it twice with variations
  const hasMultiple = Object.values(groups).some(g => g.length >= 2);
  if (!hasMultiple) {
    const base = normalized[0];
    const destKey = groupKey(base);
    groups[destKey] = groups[destKey] || [base];
    // Create two additional rows with different amounts and processingDates
    const isoBase = base[8] && /^\d{4}-\d{2}-\d{2}$/.test(base[8]) ? base[8] : normalizeDateToIso(base[8] || '');
    const clone1 = base.slice();
    clone1[7] = String(Number(base[7] || '0') + 100); // +100 pence (or units)
    clone1[8] = isoBase ? addDaysIso(isoBase, 1) : isoBase;
    const clone2 = base.slice();
    clone2[7] = String(Math.max(1, Number(base[7] || '0') + 200));
    clone2[8] = isoBase ? addDaysIso(isoBase, 2) : isoBase;
    groups[destKey].push(clone1, clone2);
  }

  // Flatten groups back to rows
  const outRows: string[][] = Object.values(groups).flat();

  // Map each row into the DDICA CSV shape. Required headers:
  // SeqNo,PayingBankReference,SUReference,PayerSortCode,PayerAccount,PayerName,NoOfAdvForClaim,TotalAmount,DateOfDirectDebit,Amount,DateOfDebit
  const header = [
    'SeqNo','PayingBankReference','SUReference','PayerSortCode','PayerAccount','PayerName','NoOfAdvForClaim','TotalAmount','DateOfDirectDebit','Amount','DateOfDebit'
  ];

  const mapped = outRows.map((r, idx) => {
    // r indexes follow EaziPay: 0 txn,1 origSort,2 origAcct,3 destSort,4 destAcct,5 destName,6 fixedZero,7 amount,8 processingDate,9 empty,10 sunName,11 bacsReference,12 sunNumber
    const seq = idx + 1;
    const payingBankReference = String(r[11] || '');
    const suReference = String(r[10] || '');
    const payerSort = String(r[3] || '');
    const payerAcct = String(r[4] || '');
    const payerName = sanitizeAccountName(String(r[5] || '')).slice(0, 35); // allow longer payer name
    const noOfAdv = 1;
    // TotalAmount and Amount: use the numeric value from column 7. If appears to be pence, convert to major units by dividing by 100 when large.
    let rawAmount = Number(String(r[7] || '0').replace(/[^0-9.-]+/g,'')) || 0;
    // Heuristic: if > 100000 then likely pence -> convert
    if (rawAmount > 100000) rawAmount = rawAmount / 100;
    const totalAmount = rawAmount;
    const dateIso = normalizeDateToIso(String(r[8] || ''));
    return [
      String(seq),
      payingBankReference,
      suReference,
      payerSort,
      payerAcct,
      payerName,
      String(noOfAdv),
      String(Number(totalAmount) || 0),
      dateIso,
      String(Number(totalAmount) || 0),
      dateIso,
    ];
  });

  const outContent = [header.join(','), ...mapped.map(r => r.join(','))].join('\n');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, outContent, 'utf8');
  console.log('Prepared debit-only CSV written to', out);
})();
