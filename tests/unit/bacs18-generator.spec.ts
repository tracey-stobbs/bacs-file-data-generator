import { describe, it, expect, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  generateValidBacs18Row,
  generateInvalidBacs18Row,
} from '../../src/lib/fileType/bacs18PaymentLines/generator.js';

describe('Bacs18PaymentLines Generator', () => {
  beforeEach(() => {
    // Set a deterministic seed for reproducible tests
    faker.seed(12345);
  });

  describe('generateValidBacs18Row', () => {
    it('should generate a valid row with provided originating account details', () => {
      const originating = {
        sortCode: '401726',
        accountNumber: '12345678',
        accountName: 'ACME LTD',
      };

      const row = generateValidBacs18Row(originating);

      expect(row.originatingSortCode).toBe('401726');
      expect(row.originatingAccountNumber).toBe('12345678');
      expect(row.originatingAccountName).toContain('ACME LTD');
    });

    it('should generate a valid row with faker-generated values when originating not provided', () => {
      const row = generateValidBacs18Row(undefined);

      // Should have generated values (6 digits for sort code, 8 for account number)
      expect(row.originatingSortCode).toMatch(/^\d{6}$/);
      expect(row.originatingAccountNumber).toMatch(/^\d{8}$/);
      expect(row.originatingAccountName).toBeTruthy();
      expect(row.originatingAccountName.length).toBe(18); // Padded to 18 chars
    });

    it('should generate MULTI type with Julian date by default', () => {
      const row = generateValidBacs18Row(
        { sortCode: '123456', accountNumber: '12345678', accountName: 'TEST' },
        { bacs18Type: 'MULTI' }
      );

      // MULTI type should have Julian date format: space + 2-digit year + 3-digit day (6 chars total)
      expect(row.processingDateJulian).toMatch(/^ \d{5}$/);
      expect(row.processingDateJulian.length).toBe(6);
    });

    it('should generate DAILY type with blank processing date', () => {
      const row = generateValidBacs18Row(
        { sortCode: '123456', accountNumber: '12345678', accountName: 'TEST' },
        { bacs18Type: 'DAILY' }
      );

      // DAILY type should have 6 spaces for processing date
      expect(row.processingDateJulian).toBe('      ');
      expect(row.processingDateJulian.length).toBe(6);
    });

    it('should sanitize and pad originating account name to 18 characters', () => {
      const originating = {
        sortCode: '123456',
        accountNumber: '12345678',
        accountName: 'Short',
      };

      const row = generateValidBacs18Row(originating);

      expect(row.originatingAccountName.length).toBe(18);
      expect(row.originatingAccountName).toBe('SHORT             '); // Uppercase + padded
    });

    it('should generate all required fields', () => {
      const row = generateValidBacs18Row({
        sortCode: '123456',
        accountNumber: '12345678',
        accountName: 'TEST',
      });

      expect(row.destinationSortCode).toBeTruthy();
      expect(row.destinationAccountNumber).toBeTruthy();
      expect(row.fixedZero).toBe('0');
      expect(row.transactionCode).toBeTruthy();
      expect(row.originatingSortCode).toBe('123456');
      expect(row.originatingAccountNumber).toBe('12345678');
      expect(row.realtimeInformationChecksum).toBeTruthy();
      expect(row.amountPence).toBeTruthy();
      expect(row.originatingAccountName).toBeTruthy();
      expect(row.paymentReference).toBeTruthy();
      expect(row.destinationAccountName).toBeTruthy();
      expect(row.processingDateJulian).toBeTruthy();
    });

    it('should generate amount in pence with correct padding', () => {
      const row = generateValidBacs18Row({
        sortCode: '123456',
        accountNumber: '12345678',
        accountName: 'TEST',
      });

      // Amount should be 11 characters, right-aligned with leading zeros
      expect(row.amountPence.length).toBe(11);
      expect(row.amountPence).toMatch(/^\d{11}$/);
    });
  });

  describe('generateInvalidBacs18Row', () => {
    it('should generate invalid row with invalid sort code', () => {
      const originating = {
        sortCode: '401726',
        accountNumber: '12345678',
        accountName: 'ACME LTD',
      };

      const row = generateInvalidBacs18Row(originating);

      // Invalid row should have non-numeric destination sort code
      expect(row.destinationSortCode).toBe('ABCDEF');
    });

    it('should respect DAILY type in invalid rows', () => {
      const row = generateInvalidBacs18Row(
        { sortCode: '123456', accountNumber: '12345678', accountName: 'TEST' },
        { bacs18Type: 'DAILY' }
      );

      // Should still have blank processing date for DAILY type
      expect(row.processingDateJulian).toBe('      ');
    });

    it('should work with faker-generated originating when not provided', () => {
      const row = generateInvalidBacs18Row(undefined, { bacs18Type: 'MULTI' });

      expect(row.destinationSortCode).toBe('ABCDEF');
      expect(row.originatingSortCode).toMatch(/^\d{6}$/);
      expect(row.originatingAccountNumber).toMatch(/^\d{8}$/);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain MULTI default when bacs18Type not specified', () => {
      const row = generateValidBacs18Row({
        sortCode: '123456',
        accountNumber: '12345678',
        accountName: 'TEST',
      });

      // Without specifying bacs18Type, should default to MULTI behavior (not DAILY)
      // MULTI has Julian date, not blank spaces
      expect(row.processingDateJulian).toMatch(/^ \d{5}$/);
    });

    it('should accept originating account details as before', () => {
      const originating = {
        sortCode: '401726',
        accountNumber: '12345678',
        accountName: 'ACME LTD',
      };

      const row = generateValidBacs18Row(originating);

      expect(row.originatingSortCode).toBe('401726');
      expect(row.originatingAccountNumber).toBe('12345678');
    });
  });
});
