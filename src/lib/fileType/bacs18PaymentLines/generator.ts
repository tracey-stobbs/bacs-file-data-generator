import { nodeFs, safeJoinOutput } from '../../utils/fsWrapper.js';
import { DateTime } from 'luxon';
import { faker } from '@faker-js/faker';
import { Bacs18Validator } from '../../validators/bacs18Validator.js';
export type Bacs18Type = 'DAILY' | 'MULTI';
export interface Bacs18Row { destinationSortCode: string; destinationAccountNumber: string; fixedZero: string; transactionCode: string; originatingSortCode: string; originatingAccountNumber: string; realtimeInformationChecksum: string; amountPence: string; originatingAccountName: string; paymentReference: string; destinationAccountName: string; processingDateJulian: string; }
interface Bacs18PreviewRequest { numberOfRows: number; bacs18Type?: Bacs18Type; originating: { sortCode: string; accountNumber: string; accountName: string }; fileType: 'Bacs18PaymentLines'; sun?: string; hasInvalidRows?: boolean; }
export function previewRows(req: Bacs18PreviewRequest, invalid: boolean): { headers: { name: string; value: number }[]; rows: { fields: { value: string; order: number }[] }[]; metadata: { fileType: 'Bacs18PaymentLines'; sun?: string; type: Bacs18Type } } {
	const type: Bacs18Type = req.bacs18Type ?? 'MULTI';
	const headers = ['Destination Sort Code','Destination Account Number','Fixed zero','Transaction Code','Originating Sort Code','Originating Account Number','RealTimeInformationCheckSum','Amount','Originating Account Name','Payment Reference','Destination Account Name','Processing Date'];
	const rows = Array.from({ length: req.numberOfRows }, (_, idx) => (invalid && idx > 0 ? generateInvalidBacs18Row(req.originating) : generateValidBacs18Row(req.originating)))
		.map(r => { const line = formatBacs18Row(r, type); return { fields: headers.map((h, i) => ({ value: line, order: i })) }; });
	return { headers: headers.map((h,i)=>({ name:h, value:i })), rows, metadata: { fileType: req.fileType, sun: req.sun, type } };
}
export interface Bacs18GenerateRequest extends Omit<Bacs18PreviewRequest,'fileType'> { fileType: 'Bacs18PaymentLines'; }
export async function generateFile(req: Bacs18GenerateRequest): Promise<{ filePath: string; fileContent: string }> {
	const validityFlag = req.hasInvalidRows ? 'I':'V';
	const ts = DateTime.now().toFormat('yyyyLLdd_HHmmss');
	const type: Bacs18Type = req.bacs18Type ?? 'MULTI';
	const fileName = `Bacs18PaymentLines_${type}_${req.numberOfRows}_${validityFlag}_${ts}.txt`;
	const rel = safeJoinOutput('Bacs18PaymentLines', req.sun ?? 'DEFAULT', fileName);
	const lines: string[] = [];
	for (let i=0;i<req.numberOfRows;i++) {
		const invalidRow = req.hasInvalidRows && i>0;
		const row = invalidRow? generateInvalidBacs18Row(req.originating): generateValidBacs18Row(req.originating);
		lines.push(formatBacs18Row(row,type));
	}
	const content = lines.join('\n')+'\n';
	await nodeFs.writeTextFile(rel, content);
	return { filePath: rel, fileContent: content };
}
function sanitize(s: string): string { return s.toUpperCase().replace(/[^A-Z0-9.&/\-\s]/g,' '); }
function padLeft(s: string, len: number, pad: string): string { return s.length >= len ? s.slice(0,len) : pad.repeat(len - s.length) + s; }
function padRight(s: string, len: number, pad: string): string { return s.length >= len ? s.slice(0,len) : s + pad.repeat(len - s.length); }
function julian(dt: DateTime): string { const year = dt.toFormat('yy'); const day = String(dt.ordinal).padStart(3,'0'); return ` ${year}${day}`; }
export function generateValidBacs18Row(originating: { sortCode: string; accountNumber: string; accountName: string }): Bacs18Row { const amountPence = String(faker.number.int({ min:1, max:9_999_999 })) + '00'; const tx = faker.helpers.arrayElement(Bacs18Validator.allowedTransactionCodes); return { destinationSortCode: faker.string.numeric(6), destinationAccountNumber: faker.string.numeric(8), fixedZero: '0', transactionCode: tx, originatingSortCode: originating.sortCode, originatingAccountNumber: originating.accountNumber, realtimeInformationChecksum: faker.helpers.arrayElement(['0000','ABCD','EFGH']), amountPence: padLeft(amountPence,11,'0').slice(-11), originatingAccountName: sanitize(originating.accountName).padEnd(18,' ').slice(0,18), paymentReference: sanitize(faker.string.alphanumeric({ length: { min:7, max:17 } })).padEnd(18,' ').slice(0,18), destinationAccountName: sanitize(faker.company.name()).padEnd(18,' ').slice(0,18), processingDateJulian: julian(DateTime.now()) }; }
export function generateInvalidBacs18Row(originating: { sortCode: string; accountNumber: string; accountName: string }): Bacs18Row { const row = generateValidBacs18Row(originating); row.destinationSortCode = 'ABCDEF'; return row; }
export function formatBacs18Row(row: Bacs18Row, type: Bacs18Type): string { const chunks = [ padRight(row.destinationSortCode,6,'0'), padRight(row.destinationAccountNumber,8,'0'), padRight(row.fixedZero,1,'0'), padRight(row.transactionCode,2,' '), padRight(row.originatingSortCode,6,'0'), padRight(row.originatingAccountNumber,8,'0'), padRight(row.realtimeInformationChecksum,4,'0'), padLeft(row.amountPence,11,'0'), padRight(sanitize(row.originatingAccountName),18,' '), padRight(sanitize(row.paymentReference),18,' '), padRight(sanitize(row.destinationAccountName),18,' '), padRight(row.processingDateJulian,6,' ') ]; const line = chunks.join(''); const len = Bacs18Validator.getLineLength(type); return line.slice(0,len); }
