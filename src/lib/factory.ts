import type {
  GenerationRequest,
  PreviewResult,
  GeneratedFileResult,
  EaziPayGenerationRequest,
} from '../types.js';
import { createDeterminismContext } from './determinism/context.js';
import { ensureSeeded } from './seeding/ensureSeeded.js';

export async function generateFile(req: GenerationRequest & { fakerSeed?: number; fixedTimestamp?: number }): Promise<GeneratedFileResult> {
  if (req.fileType === 'EaziPay') {
    const mod = await import('./fileType/eazipay/generator.js');
    const seed = ensureSeeded({ seed: req.fakerSeed });
    const fixed = typeof req.fixedTimestamp === 'number' ? req.fixedTimestamp : undefined;
    const ctx = seed != null ? createDeterminismContext(seed, fixed) : undefined;
    return mod.generateFile(req, { determinism: ctx });
  }
  throw new Error(`Unsupported fileType ${(req as { fileType?: unknown }).fileType}`);
}

export async function previewRows(req: GenerationRequest): Promise<PreviewResult> {
  if (req.fileType === 'EaziPay') {
    const mod = await import('./fileType/eazipay/generator.js');
    return mod.previewRows(req as EaziPayGenerationRequest, !!req.hasInvalidRows);
  }
  throw new Error(`Unsupported fileType ${(req as { fileType?: unknown }).fileType}`);
}
