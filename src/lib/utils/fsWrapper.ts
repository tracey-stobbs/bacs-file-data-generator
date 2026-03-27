import { promises as fs } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
export interface FileSystem {
  ensureDir(path: string): Promise<void>;
  writeTextFile(path: string, content: string): Promise<void>;
}
export const nodeFs: FileSystem = {
  async ensureDir(path: string) {
    // Retry mkdir a few times to absorb transient EPERM/EBUSY on Windows (AV/file indexing)
    let lastErr: unknown = null;
    for (let i = 0; i < 5; i++) {
      try {
        await fs.mkdir(path, { recursive: true });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        // EPERM and EBUSY are occasionally raised; brief backoff then retry
        await new Promise((res) => setTimeout(res, 10 + i * 20));
      }
    }
    if (lastErr) throw lastErr;
  },
  async writeTextFile(path: string, content: string) {
    // Use same retry strategy for parent directory creation.
    let lastErr: unknown = null;
    for (let i = 0; i < 5; i++) {
      try {
        await fs.mkdir(dirname(path), { recursive: true });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((res) => setTimeout(res, 10 + i * 20));
      }
    }
    if (lastErr) throw lastErr;
    await fs.writeFile(path, content, 'utf8');
  },
};
export function safeJoinOutput(...segments: string[]): string {
  // Allow tests or callers to override the base output root via OUTPUT_ROOT env
  // variable. If provided, use an absolute resolved path; otherwise default to
  // a local `output` directory under the project.
  const outputRoot = process.env.OUTPUT_ROOT ? resolve(process.env.OUTPUT_ROOT) : resolve('output');
  const fullPath = normalize(join(outputRoot, ...segments));
  // Ensure the computed path sits under the chosen output root to avoid
  // accidental writes outside the intended directory.
  if (!fullPath.startsWith(outputRoot)) {
    throw new Error('Invalid output path');
  }
  return fullPath;
}
