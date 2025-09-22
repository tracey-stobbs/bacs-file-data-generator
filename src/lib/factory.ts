import type { GenerationRequest, PreviewResult, GeneratedFileResult, EaziPayGenerationRequest } from '../types.js';

export async function generateFile(req: GenerationRequest): Promise<GeneratedFileResult> {
	if (req.fileType === 'EaziPay') {
		const mod = await import('./fileType/eazipay/generator.js');
		return mod.generateFile(req);
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
