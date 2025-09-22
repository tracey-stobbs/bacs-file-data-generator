import type { EaziPayTransactionCode } from '../fileType/eazipay/types.js';
export const EaziPayValidator = {
  allowedTransactionCodes: ['01','17','18','99','0C','0N','0S'] as const,
  isTransactionCode(code: unknown): code is EaziPayTransactionCode { return typeof code === 'string' && (EaziPayValidator.allowedTransactionCodes as readonly string[]).includes(code); },
  isContraCode(code: unknown): boolean { return typeof code === 'string' && ['0C','0N','0S'].includes(code); },
  isSunNumberAllowed(transactionCode: unknown): boolean { return typeof transactionCode === 'string' && ['0C','0N','0S'].includes(transactionCode); },
  getColumnCount(): number { return 14; }
} as const;
