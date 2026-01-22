import type {
  GenerationRequest,
  PreviewResult,
  GeneratedFileResult,
  EaziPayGenerationRequest,
  Bacs18GenerationRequest,
} from '../types.js';
import { createDeterminismContext } from './determinism/context.js';
import { ensureSeeded } from './seeding/ensureSeeded.js';
import { AppError } from './errors/AppError.js';

export async function generateFile(
  req: GenerationRequest & {
    fakerSeed?: number;
    fixedTimestamp?: number;
    dateFormat?: string;
    allowedTransactionCodes?: string[];
    processingDate?: string;
  }
): Promise<GeneratedFileResult> {
  const seed = ensureSeeded({ seed: req.fakerSeed });
  const fixed = typeof req.fixedTimestamp === 'number' ? req.fixedTimestamp : undefined;
  const ctx = seed != null ? createDeterminismContext(seed, fixed) : undefined;

  switch (req.fileType) {
    case 'EaziPay': {
      const mod = await import('./fileType/eazipay/generator.js');
      const eaziReq: EaziPayGenerationRequest & {
        dateFormat?: string;
        allowedTransactionCodes?: string[];
        processingDate?: string;
      } = {
        fileType: 'EaziPay',
        numberOfRows: req.numberOfRows,
        hasInvalidRows: req.hasInvalidRows,
        sun: req.sun,
        dateFormat: req.dateFormat,
        allowedTransactionCodes: req.allowedTransactionCodes,
        originating: (req as any).originating,
        processingDate: req.processingDate,
      };
      return mod.generateFile(eaziReq, { determinism: ctx });
    }
    case 'SDDirect': {
      const mod = await import('./fileType/sddirect/index.js');
      return mod.generateSDDirectFile(req as any, { determinism: ctx });
    }
    case 'Bacs18PaymentLines': {
      const mod = await import('./fileType/bacs18PaymentLines/index.js');
      return mod.generateBacs18File(req as Bacs18GenerationRequest, { determinism: ctx });
    }
    // Wire SDDirect and Bacs18PaymentLines when type unions are expanded
    default:
      throw new AppError(
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported fileType ${(req as { fileType?: unknown }).fileType}`,
        400,
        {
          fileType: (req as { fileType?: unknown }).fileType,
        }
      );
  }
}

export async function previewRows(req: GenerationRequest): Promise<PreviewResult> {
  switch (req.fileType) {
    case 'EaziPay': {
      const mod = await import('./fileType/eazipay/generator.js');
      return mod.previewRows(req as EaziPayGenerationRequest, !!req.hasInvalidRows);
    }
    case 'SDDirect': {
      const mod = await import('./fileType/sddirect/index.js');
      return mod.previewSDDirectRows(req as any, !!req.hasInvalidRows);
    }
    case 'Bacs18PaymentLines': {
      const mod = await import('./fileType/bacs18PaymentLines/index.js');
      const invalid = !!req.hasInvalidRows;
      return mod.previewBacs18Rows(req as unknown as Bacs18GenerationRequest, invalid);
    }
    default:
      throw new AppError(
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported fileType ${(req as { fileType?: unknown }).fileType}`,
        400,
        {
          fileType: (req as { fileType?: unknown }).fileType,
        }
      );
  }
}
