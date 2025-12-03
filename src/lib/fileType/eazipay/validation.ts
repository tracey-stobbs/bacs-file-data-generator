import type { EaziPayInput, EaziPayValidationResult } from './types.js';

export function validateEaziPayInput(input: EaziPayInput): EaziPayValidationResult {
  if (!Number.isInteger(input.rows) || input.rows <= 0) {
    return { isValid: false, message: 'rows must be a positive integer' };
  }
  return { isValid: true };
}
