interface SDDirectValidatorShape {
  readonly allowedTransactionCodes: readonly ['01','17','18','99','0C','0N','0S'];
  isTransactionCode(code: unknown): code is SDDirectValidatorShape['allowedTransactionCodes'][number];
  isContraCode(code: string): boolean;
  getColumnCount(includeOptionalFields?: boolean): number;
}

export const SDDirectValidator: SDDirectValidatorShape = {
  allowedTransactionCodes: ['01','17','18','99','0C','0N','0S'],
  isTransactionCode(code: unknown): code is SDDirectValidatorShape['allowedTransactionCodes'][number] { return typeof code === 'string' && (SDDirectValidator.allowedTransactionCodes as readonly string[]).includes(code); },
  isContraCode(code: string): boolean { return ['0C','0N','0S'].includes(code); },
  getColumnCount(includeOptionalFields = true): number { return includeOptionalFields ? 11 : 6; }
};
