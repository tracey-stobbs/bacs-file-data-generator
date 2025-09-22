import { DateTime } from 'luxon';
import { pickRandomEaziPayFormat } from '../utils/dateFormatter.js';
import type { EaziPayDateFormat } from '../utils/dateFormatter.js';
import type { FileSystem } from '../utils/fsWrapper.js';
import { safeJoinOutput } from '../utils/fsWrapper.js';

interface SerializeCapable { rows?: string[][]; serialize(rows: string[][]): string; numberOfRows?: number; hasInvalidRows?: boolean; fileType?: string; fileContent?: string; }
interface BasicRowsCapable { rows?: string[][]; numberOfRows?: number; hasInvalidRows?: boolean; fileType?: string; fileContent?: string; serialize?: undefined; }
type FileWriterRequest = SerializeCapable | BasicRowsCapable;

export async function generateFileWithFs(
	request: FileWriterRequest,
	fs: FileSystem,
	sun: string,
	options?: { fileType?: string; columns?: number; includeHeaders?: boolean; validity?: 'V' | 'I' },
): Promise<{ filePath: string; fileContent: string }> {
	const fileType = options?.fileType ?? request.fileType ?? 'EaziPay';
	const columns = options?.columns ?? (fileType === 'EaziPay' ? 14 : undefined);
	const headerFlag = options?.includeHeaders ? 'H' : 'NH';
	const validityFlag = options?.validity ?? (request.hasInvalidRows ? 'I' : 'V');
	const ts = DateTime.now().toFormat('yyyyLLdd_HHmmss');
	let ext = 'csv';
	if (fileType === 'EaziPay') { ext = Math.random() < 0.5 ? 'csv' : 'txt'; } else if (fileType === 'Bacs18PaymentLines' || fileType === 'Bacs18StandardFile') { ext = 'txt'; }
	const colsPart = columns ? `${columns}` : 'x';
	const fileName = `${fileType}_${colsPart}_${request.numberOfRows ?? 'x'}_${headerFlag}_${validityFlag}_${ts}.${ext}`;
	const rel = safeJoinOutput(fileType, sun, fileName);
	let content: string;
	if (typeof (request as SerializeCapable).serialize === 'function') {
		const rows = request.rows ?? [];
		content = (request as SerializeCapable).serialize(rows);
	} else if (typeof request.fileContent === 'string') {
		content = request.fileContent;
	} else {
		content = (request.rows ?? []).map(r => r.join(',')).join('\n');
		if (content.length>0 && !content.endsWith('\n')) content += '\n';
	}
	await fs.writeTextFile(rel, content);
	return { filePath: rel, fileContent: content };
}

export function chooseEaziPayDateFormat(provided?: string): EaziPayDateFormat { if (provided) return provided as EaziPayDateFormat; return pickRandomEaziPayFormat(); }