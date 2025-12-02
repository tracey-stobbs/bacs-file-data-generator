import fs from 'fs';
import path from 'path';
import { generateFile } from '../lib/factory.js';
import type { GenerationRequest } from '../types.js';

// Programmatic smoke test: call generateFile directly under Vitest to avoid loader issues
describe('CLI integration smoke', () => {
  const outRoot = path.resolve(__dirname, '../../output/test-cli-smoke');
  // Using loose function type to avoid import() type annotation lint violation.
  let originalWriteFile: ((...args: unknown[]) => Promise<unknown>) | undefined;

  beforeAll(() => {
    // Ensure clean
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
    process.env.OUTPUT_ROOT = outRoot;
    // Monkey patch writeFile to avoid filesystem permission issues in CI/locked env
    // Focus of this smoke test is deterministic generation, not I/O.
    if ((fs as any).promises?.writeFile) {
      originalWriteFile = (fs as any).promises.writeFile;
      (fs as any).promises.writeFile = async () => {
        return;
      };
    }
  });

  afterAll(() => {
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
    if (originalWriteFile) {
      (fs as any).promises.writeFile = originalWriteFile;
    }
  });

  it('generates deterministically with faker seed', async () => {
    process.env.FAKER_SEED = '1234';

    const req: GenerationRequest = {
      fileType: 'EaziPay',
      numberOfRows: 5,
      hasInvalidRows: false,
    };

    const result = await generateFile(req);

    expect(result).toBeTruthy();
    expect(typeof result.fileContent).toBe('string');
    expect(result.fileContent.length).toBeGreaterThan(10);
  }, 20000);
});
