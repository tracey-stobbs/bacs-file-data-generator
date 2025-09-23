/**
 * Lightweight CSV quoting & parsing utilities (RFC 4180 subset):
 * - Fields containing commas, quotes, or newlines are quoted with double quotes.
 * - Embedded quotes are escaped by doubling.
 * - Parser handles quoted fields and escaped quotes.
 */
export function csvQuote(fields: string[]): string {
  return fields.map(f => {
    if (f === '') return f; // keep empty bare
    if (/[",\n]/.test(f)) return '"' + f.replace(/"/g, '""') + '"';
    return f;
  }).join(',');
}

export function csvParse(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      cur += ch;
    } else {
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ',') { out.push(cur); cur=''; continue; }
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
