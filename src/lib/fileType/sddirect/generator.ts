import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';
import { SDDirectValidator } from '../../validators/sddirectValidator.js';
import type { DeterminismContext } from '../../determinism/context.js';
import { AddWorkingDays } from '../../utils/calendar.js';
import { nodeFs, safeJoinOutput } from '../../utils/fsWrapper.js';
import type { OriginatingAccountDetails } from '../../../types.js';

export interface SDDirectRowBase {
  destinationAccountName: string;
  destinationSortCode: string;
  destinationAccountNumber: string;
  paymentReference: string;
  amount: string;
  transactionCode: string;
}
export interface SDDirectRowOptional extends SDDirectRowBase {
  realtimeInformationChecksum: string;
  payDate: string;
}
export type SDDirectRow = SDDirectRowBase | SDDirectRowOptional;

export function generateValidRow(includeOptionalFields: boolean | string[], ctx?: DeterminismContext): SDDirectRow {
  const code = pickSDDirectCode(ctx);
  const isContra = SDDirectValidator.isContraCode(code);
  const base: SDDirectRowBase = {
    destinationAccountName: allowedName(),
    destinationSortCode: faker.string.numeric(6),
    destinationAccountNumber: faker.string.numeric(8),
    paymentReference: buildPaymentRef(),
    amount: isContra ? '0' : String(faker.number.int({ min: 1, max: 1_000_000 })),
    transactionCode: code,
  };
  if (includeOptionalFields === true) {
    const payDate = formatPayDate(code, ctx);
    return {
      ...base,
      realtimeInformationChecksum: faker.helpers.arrayElement(['0000', '/ABC', '']),
      payDate,
    };
  }
  return base;
}

export function generateInvalidRow(includeOptionalFields: boolean | string[], ctx?: DeterminismContext): SDDirectRow {
  const row = generateValidRow(includeOptionalFields, ctx);
  if ('destinationSortCode' in row) {
    (row as SDDirectRowBase).destinationSortCode = 'ABCDEF';
  }
  return row;
}

function pickSDDirectCode(ctx?: DeterminismContext): string {
  const arr = SDDirectValidator.allowedTransactionCodes;
  const r = ctx?.rng ? ctx.rng() : Math.random();
  const idx = Math.floor(r * arr.length);
  return arr[idx] ?? arr[0];
}
function allowedName(): string {
  const base = faker.string.alphanumeric({ length: { min: 3, max: 18 } }).toUpperCase();
  return base.replace(/[^A-Z0-9.&/\-\s]/g, ' ');
}
function buildPaymentRef(): string {
  let s = faker.string.alphanumeric({ length: { min: 7, max: 17 } }).toUpperCase();
  if (s.startsWith('DDIC') || s.startsWith(' ')) s = 'X' + s.slice(1);
  if (new Set(s).size === 1) s = s.slice(0, -1) + 'Z';
  return s;
}
function formatPayDate(code: string, ctx?: DeterminismContext): string {
  const isContra = code === '0C' || code === '0N' || code === '0S';
  const days = isContra ? 3 : faker.number.int({ min: 3, max: 30 });
  const base = ctx?.now ? DateTime.fromMillis(ctx.now()) : DateTime.now();
  const dt = AddWorkingDays(base, days);
  return dt.toFormat('yyyyLLdd');
}

export function previewRows(
  req: {
    numberOfRows: number;
    fileType: 'SDDirect';
    hasInvalidRows?: boolean;
    includeOptionalFields?: boolean;
    originating?: OriginatingAccountDetails;
    sun?: string;
  },
  invalid: boolean,
  ctx?: DeterminismContext
): { headers: { name: string; value: number }[]; rows: { fields: { value: string; order: number }[] }[]; metadata: { fileType: 'SDDirect'; sun?: string } } {
  const headers = [
    'Destination Account Name',
    'Destination Sort Code',
    'Destination Account Number',
    'Payment Reference',
    'Amount',
    'Transaction Code',
    'Realtime Information Checksum',
    'Pay Date',
  ];
  const rows = Array.from({ length: req.numberOfRows }, (_, idx) => {
    const row = invalid && idx > 0 ? generateInvalidRow(!!req.includeOptionalFields, ctx) : generateValidRow(!!req.includeOptionalFields, ctx);
    const asArray: string[] = [
      row.destinationAccountName,
      row.destinationSortCode,
      row.destinationAccountNumber,
      row.paymentReference,
      row.amount,
      row.transactionCode,
      'realtimeInformationChecksum' in row ? row.realtimeInformationChecksum : '',
      'payDate' in row ? row.payDate : '',
    ];
    return { fields: headers.map((_, i) => ({ value: asArray[i], order: i })) };
  });
  return {
    headers: headers.map((h, i) => ({ name: h, value: i })),
    rows,
    metadata: { fileType: 'SDDirect', sun: req.sun },
  };
}

export async function generateFile(
  req: {
    numberOfRows: number;
    fileType: 'SDDirect';
    hasInvalidRows?: boolean;
    includeOptionalFields?: boolean;
    originating?: OriginatingAccountDetails;
    sun?: string;
  },
  opts?: { determinism?: DeterminismContext }
): Promise<{ filePath: string; fileContent: string }> {
  const validityFlag = req.hasInvalidRows ? 'I' : 'V';
  const nowMillis = opts?.determinism?.now ? opts.determinism.now() : Date.now();
  const ts = DateTime.fromMillis(nowMillis).toFormat('yyyyLLdd_HHmmss');
  const fileName = `SDDirect_${req.numberOfRows}_${validityFlag}_${ts}.csv`;
  const rel = safeJoinOutput('SDDirect', req.sun ?? 'DEFAULT', fileName);
  const preview = previewRows(req, !!req.hasInvalidRows, opts?.determinism);
  const content = preview.rows.map((r) => r.fields.map((f) => f.value).join(',')).join('\n') + '\n';
  await nodeFs.writeTextFile(rel, content);
  return { filePath: rel, fileContent: content };
}
