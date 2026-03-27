const fs = require('fs');
const path = require('path');

function isWorkingDay(d) {
  const wd = d.getDay();
  return wd !== 0 && wd !== 6;
}

function addDays(date, days) {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function getWorkingDateFromTomorrow(k) {
  const today = new Date();
  let d = addDays(today, 1);
  let count = 1;
  while (count < k) {
    d = addDays(d, 1);
    if (isWorkingDay(d)) count++;
  }
  return d;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = +date - +start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function yydddFor(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const doy = String(dayOfYear(date)).padStart(3, '0');
  return yy + doy;
}

function parseArgs() {
  const out = {};
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--seed=')) out.seed = Number(a.split('=')[1]);
  }
  return out;
}

function makeRng(seed) {
  let s = seed ? seed >>> 0 : Math.floor(Math.random() * 0xffffffff) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function main() {
  const { seed } = parseArgs();
  const rng = makeRng(seed);

  const dir = path.join('output', 'file-data-generator', 'Bacs18PaymentLines');
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir).filter(f => f.startsWith('TMS') && f.endsWith('.txt'));
  if (files.length === 0) {
    console.log('No TMS files found, nothing to do.');
    return;
  }

  for (const file of files) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full, 'utf8');
    const newline = raw.includes('\r\n') ? '\r\n' : '\n';
    const endedWithNewline = raw.endsWith('\n');
    let lines = raw.split(newline);
    if (endedWithNewline && lines.length && lines[lines.length - 1] === '') lines.pop();

    const rowCount = lines.length;
    if (rowCount === 0) continue;

    const workingDates = [];
    for (let k = 1; k <= 10; k++) {
      const d = getWorkingDateFromTomorrow(k);
      workingDates.push(yydddFor(d));
    }

    const assignments = new Array(rowCount).fill(0);
    const idx1 = Math.floor(rng() * rowCount);
    const pick1 = 1 + Math.floor(rng() * 3);
    assignments[idx1] = pick1;
    let idx2 = Math.floor(rng() * rowCount);
    if (rowCount > 1) {
      while (idx2 === idx1) idx2 = Math.floor(rng() * rowCount);
    }
    const pick2 = 4 + Math.floor(rng() * 7);
    assignments[idx2] = pick2;
    for (let i = 0; i < rowCount; i++) {
      if (assignments[i] === 0) {
        const pick = 1 + Math.floor(rng() * 10);
        assignments[i] = pick;
      }
    }

    const ddiSet = new Set(['0N', '0C', '0S']);
    const updated = [];

    for (let i = 0; i < rowCount; i++) {
      const line = lines[i];
      if (line.length !== 106) {
        throw new Error(`${file}: line ${i + 1} expected length 106 but was ${line.length}`);
      }
      const tx = line.slice(15, 17);
      let newTx = tx;
      let isCredit = false;
      if (ddiSet.has(tx)) {
        newTx = '99';
        isCredit = true;
      } else if (tx === '99') {
        isCredit = true;
      }
      const workingDays = assignments[i];
      let amount = workingDays * 100;
      if (isCredit) amount += 50;
      const amountStr = String(amount).padStart(11, '0');
      const dateStr = workingDates[workingDays - 1];
      const beforeTx = line.slice(0, 15);
      const afterTxToAmt = line.slice(17, 35);
      const afterAmtToDate = line.slice(46, 101);
      const afterDate = line.slice(106);
      const newLine = beforeTx + newTx + afterTxToAmt + amountStr + afterAmtToDate + dateStr + afterDate;
      if (newLine.length !== 106) {
        throw new Error(`${file}: line ${i + 1} produced length ${newLine.length} (expected 106)`);
      }
      updated.push(newLine);
    }

    let outContent = updated.join(newline);
    if (endedWithNewline) outContent += newline;
    fs.writeFileSync(full, outContent, 'utf8');
    console.log(`Updated ${file} (${rowCount} rows)`);
  }
}

try {
  main();
} catch (err) {
  console.error('ERROR:', err);
  process.exit(1);
}
