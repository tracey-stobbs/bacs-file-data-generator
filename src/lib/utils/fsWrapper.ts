import { promises as fs } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
export interface FileSystem { ensureDir(path: string): Promise<void>; writeTextFile(path: string, content: string): Promise<void>; }
export const nodeFs: FileSystem = { async ensureDir(path: string) { await fs.mkdir(path,{ recursive:true}); }, async writeTextFile(path: string, content: string) { await fs.mkdir(dirname(path),{ recursive:true}); await fs.writeFile(path, content,'utf8'); } };
export function safeJoinOutput(...segments: string[]): string { const rel = normalize(join('output', ...segments)); if (!rel.startsWith('output')) { throw new Error('Invalid output path'); } return rel; }
