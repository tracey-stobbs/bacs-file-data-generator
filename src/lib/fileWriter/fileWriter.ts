import { DateTime } from 'luxon';
import { pickRandomEaziPayFormat } from '../utils/dateFormatter.js';
import type { EaziPayDateFormat } from '../utils/dateFormatter.js';
import type { FileSystem } from '../utils/fsWrapper.js';
import { safeJoinOutput } from '../utils/fsWrapper.js';
import type { DeterminismContext } from '../determinism/context.js';

interface SerializeCapable {
  rows?: string[][];
  serialize(rows: string[][]): string;
  numberOfRows?: number;
  hasInvalidRows?: boolean;
  fileType?: string;
  fileContent?: string;
}
interface BasicRowsCapable {
  rows?: string[][];
  numberOfRows?: number;
  hasInvalidRows?: boolean;
  fileType?: string;
  fileContent?: string;
  serialize?: undefined;
}
type FileWriterRequest = SerializeCapable | BasicRowsCapable;

export async function generateFileWithFs(
  request: FileWriterRequest,
  fs: FileSystem,
  sun: string,
  options?: {
    fileType?: string;
    columns?: number;
    includeHeaders?: boolean;
    validity?: 'V' | 'I';
    determinism?: DeterminismContext;
  }
): Promise<{ filePath: string; fileContent: string }> {
  const fileType = options?.fileType ?? request.fileType ?? 'EaziPay';
  const tsNow = options?.determinism?.now ? options.determinism.now() : Date.now();
  const ts = DateTime.fromMillis(tsNow).toFormat('yyyy-LL-dd-HH-mm-ss');
  let ext = 'csv';
  if (fileType === 'EaziPay') {
    const r = options?.determinism?.rng ? options.determinism.rng() : Math.random();
    ext = r < 0.5 ? 'csv' : 'txt';
  } else if (fileType === 'Bacs18PaymentLines' || fileType === 'Bacs18StandardFile') {
    ext = 'txt';
  }
  const rowsCount = request.numberOfRows ?? 'x';
  const fileName = `${ts}-${fileType}-${rowsCount}.${ext}`;
  const rel = safeJoinOutput('file-data-generator', fileType, fileName);
  let content: string;
  if (typeof (request as SerializeCapable).serialize === 'function') {
    const rows = request.rows ?? [];
    content = (request as SerializeCapable).serialize(rows);
  } else if (typeof request.fileContent === 'string') {
    content = request.fileContent;
  } else {
    content = (request.rows ?? []).map((r) => r.join(',')).join('\n');
    if (content.length > 0 && !content.endsWith('\n')) content += '\n';
  }
  await fs.writeTextFile(rel, content);
  return { filePath: rel, fileContent: content };
}

export function chooseEaziPayDateFormat(provided?: string): EaziPayDateFormat {
  if (provided) return provided as EaziPayDateFormat;
  return pickRandomEaziPayFormat();
}
