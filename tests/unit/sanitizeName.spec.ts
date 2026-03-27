import { describe, it, expect } from 'vitest';
import { sanitizeAccountName } from '../../src/lib/fileType/eazipay/generator.js';
import { sanitizeName } from '../../src/lib/utils/sanitizeName.js';

describe('sanitizeAccountName', () => {
  it('removes non-ASCII and control characters, quotes and commas', () => {
    const input = 'Acme\u0007Co "Ltd", \u2603 Snowman\u00A0';
    const out = sanitizeAccountName(input);
    // Should remove the bell (0x07), quotes, comma, non-ASCII snowman and NBSP
    expect(out).toBe('AcmeCo Ltd Snowman');
  });
});

describe('sanitizeName (for filename safety)', () => {
  it('should replace spaces with hyphens', () => {
    expect(sanitizeName('ACME Ltd')).toBe('ACME-Ltd');
    expect(sanitizeName('Tech Corp Inc')).toBe('Tech-Corp-Inc');
  });

  it('should remove special characters', () => {
    expect(sanitizeName('ACME & Co.')).toBe('ACME-Co');
    expect(sanitizeName('Tech@Corp!')).toBe('TechCorp');
    expect(sanitizeName('Client#123')).toBe('Client123');
  });

  it('should preserve alphanumeric characters', () => {
    expect(sanitizeName('Client123')).toBe('Client123');
    expect(sanitizeName('ABC123XYZ')).toBe('ABC123XYZ');
  });

  it('should preserve hyphens and underscores', () => {
    expect(sanitizeName('Tech-Corp')).toBe('Tech-Corp');
    expect(sanitizeName('Client_Name')).toBe('Client_Name');
    expect(sanitizeName('My-Client_123')).toBe('My-Client_123');
  });

  it('should collapse multiple spaces into single hyphen', () => {
    expect(sanitizeName('ACME   Ltd')).toBe('ACME-Ltd');
  });

  it('should collapse multiple consecutive hyphens', () => {
    expect(sanitizeName('ACME---Ltd')).toBe('ACME-Ltd');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(sanitizeName('-ACME-')).toBe('ACME');
  });

  it('should handle mixed spaces and special characters', () => {
    expect(sanitizeName('ACME & Co. Ltd')).toBe('ACME-Co-Ltd');
  });

  it('should handle empty string', () => {
    expect(sanitizeName('')).toBe('');
  });

  it('should produce filename-safe output', () => {
    const result = sanitizeName('ACME & Co. / Partners Ltd.');
    expect(result).toBe('ACME-Co-Partners-Ltd');
    expect(result).toMatch(/^[a-zA-Z0-9-_]*$/);
  });
});
