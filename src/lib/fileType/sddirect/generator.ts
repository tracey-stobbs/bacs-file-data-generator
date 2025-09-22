import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';
import { SDDirectValidator } from '../../validators/sddirectValidator.js';
import { AddWorkingDays } from '../../utils/calendar.js';

export interface SDDirectRowBase { destinationAccountName: string; destinationSortCode: string; destinationAccountNumber: string; paymentReference: string; amount: string; transactionCode: string; }
export interface SDDirectRowOptional extends SDDirectRowBase { realtimeInformationChecksum: string; payDate: string; }
export type SDDirectRow = SDDirectRowBase | SDDirectRowOptional;

export function generateValidRow(includeOptionalFields: boolean | string[]): SDDirectRow {
	const code = pickSDDirectCode();
	const isContra = SDDirectValidator.isContraCode(code);
	const base: SDDirectRowBase = {
		destinationAccountName: allowedName(),
		destinationSortCode: faker.string.numeric(6),
		destinationAccountNumber: faker.string.numeric(8),
		paymentReference: buildPaymentRef(),
		amount: isContra ? '0' : String(faker.number.int({ min:1, max:1_000_000 })),
		transactionCode: code
	};
	if (includeOptionalFields === true) {
		const payDate = formatPayDate(code);
		return { ...base, realtimeInformationChecksum: faker.helpers.arrayElement(['0000','/ABC','']), payDate };
	}
	return base;
}

export function generateInvalidRow(includeOptionalFields: boolean | string[]): SDDirectRow {
	const row = generateValidRow(includeOptionalFields);
	if ('destinationSortCode' in row) {
		(row as SDDirectRowBase).destinationSortCode = 'ABCDEF';
	}
	return row;
}

function pickSDDirectCode(): string { const arr = SDDirectValidator.allowedTransactionCodes; const idx = Math.floor(Math.random()*arr.length); return arr[idx] ?? arr[0]; }
function allowedName(): string { const base = faker.string.alphanumeric({ length: { min:3, max:18 } }).toUpperCase(); return base.replace(/[^A-Z0-9.&/\-\s]/g,' '); }
function buildPaymentRef(): string { let s = faker.string.alphanumeric({ length: { min:7, max:17 } }).toUpperCase(); if (s.startsWith('DDIC') || s.startsWith(' ')) s = 'X'+s.slice(1); if (new Set(s).size === 1) s = s.slice(0,-1)+'Z'; return s; }
function formatPayDate(code: string): string { const isContra = code === '0C' || code === '0N' || code === '0S'; const days = isContra ? 3 : faker.number.int({ min:3, max:30 }); const dt = AddWorkingDays(DateTime.now(), days); return dt.toFormat('yyyyLLdd'); }
