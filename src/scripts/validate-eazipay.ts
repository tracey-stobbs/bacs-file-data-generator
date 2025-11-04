import fs from 'fs';
import path from 'path';
import { eaziPayAdapter } from '../lib/fileType/eazipay/generator.js';

async function main() {
  const defaultPath = path.join('output','EaziPay','DEFAULT');
  const files = fs.existsSync(defaultPath) ? fs.readdirSync(defaultPath) : [];
  if (!files || files.length === 0) {
    console.error('No files found in', defaultPath);
    process.exit(2);
  }
  const csvFile = files.filter(f => f.endsWith('.csv')).sort().reverse()[0];
  const fullPath = path.join(defaultPath, csvFile);
  console.log('Validating', fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const parsed: any = eaziPayAdapter.parse(content);
  console.log('Total rows:', parsed.rows.length);
  const bad = parsed.rows.filter((r: any) => r.fields.length !== 14);
  console.log('Rows with non-14 columns:', bad.length);
  if (parsed.rows.length > 0) {
  const sample = parsed.rows.slice(0,3).map((r: any) => ({ cols: r.fields.length, fields: r.fields.slice(0,6) }));
    console.log('Sample rows (first 3):', JSON.stringify(sample, null, 2));
  }
  // rudimentary field checks
  const errors: string[] = [];
  parsed.rows.forEach((r: any, idx: number) => {
    const f = r.fields as string[];
    // transaction code
    if (typeof f[0] !== 'string' || f[0].length === 0) errors.push(`row ${idx+1}: missing txn code`);
    // sort codes numeric 6
    if (!/^\d{6}$/.test(f[1])) errors.push(`row ${idx+1}: originating sort code invalid: "${f[1]}"`);
    if (!/^\d{8}$/.test(f[2])) errors.push(`row ${idx+1}: originating account number invalid: "${f[2]}"`);
    // amount numeric
    if (!/^-?\d+$/.test(f[7])) errors.push(`row ${idx+1}: amount invalid: "${f[7]}"`);
  });
  if (errors.length === 0) {
    console.log('Basic validation: PASS');
    process.exit(0);
  } else {
    console.log('Basic validation: FAIL');
    console.log(errors.slice(0,50).join('\n'));
    process.exit(3);
  }
}

main().catch(err => { console.error(err); process.exit(99); });
