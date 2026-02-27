import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSunsFromEnv } from '../../src/lib/config/envClientLoader.js';

describe('loadSunsFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to a clean state
    process.env = { ...originalEnv };

    // Clear any SUN_* vars
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('SUN_')) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should return empty array when no SUN_* env vars are set', () => {
    const suns = loadSunsFromEnv();
    expect(suns).toEqual([]);
  });

  it('should load a single SUN configuration', () => {
    process.env.SUN_1_SUN_NUMBER = '510001';
    process.env.SUN_1_SUN_NAME = 'TMS FM';
    process.env.SUN_1_SORT_CODE = '106057';
    process.env.SUN_1_ACCOUNT_NUMBER = '99128289';
    process.env.SUN_1_ACCOUNT_NAME = 'Holder-GO2';
    process.env.SUN_1_BANK_NAME = 'Bank-WP5A';

    const suns = loadSunsFromEnv();

    expect(suns).toHaveLength(1);
    expect(suns[0]).toEqual({
      sunNumber: '510001',
      sunName: 'TMS FM',
      sortCode: '106057',
      accountNumber: '99128289',
      accountName: 'Holder-GO2',
      bankName: 'Bank-WP5A',
    });
  });

  it('should load multiple SUN configurations', () => {
    process.env.SUN_1_SUN_NUMBER = '510001';
    process.env.SUN_1_SUN_NAME = 'TMS FM';
    process.env.SUN_1_SORT_CODE = '106057';
    process.env.SUN_1_ACCOUNT_NUMBER = '99128289';
    process.env.SUN_1_ACCOUNT_NAME = 'Holder-GO2';
    process.env.SUN_1_BANK_NAME = 'Bank-WP5A';

    process.env.SUN_2_SUN_NUMBER = '510002';
    process.env.SUN_2_SUN_NAME = 'TMS FM2';
    process.env.SUN_2_SORT_CODE = '128880';
    process.env.SUN_2_ACCOUNT_NUMBER = '64380990';
    process.env.SUN_2_ACCOUNT_NAME = 'Holder-JLY';
    process.env.SUN_2_BANK_NAME = 'Bank-ISUE';

    process.env.SUN_3_SUN_NUMBER = '510003';
    process.env.SUN_3_SUN_NAME = 'TMS FM3';
    process.env.SUN_3_SORT_CODE = '132500';
    process.env.SUN_3_ACCOUNT_NUMBER = '43258335';
    process.env.SUN_3_ACCOUNT_NAME = 'Holder-ZEW';
    process.env.SUN_3_BANK_NAME = 'Bank-S0NH';

    const suns = loadSunsFromEnv();

    expect(suns).toHaveLength(3);
    expect(suns[0].sunName).toBe('TMS FM');
    expect(suns[1].sunName).toBe('TMS FM2');
    expect(suns[2].sunName).toBe('TMS FM3');
  });

  it('should trim whitespace from SUN values', () => {
    process.env.SUN_1_SUN_NUMBER = '  510001  ';
    process.env.SUN_1_SUN_NAME = '  TMS FM  ';
    process.env.SUN_1_SORT_CODE = '  106057  ';
    process.env.SUN_1_ACCOUNT_NUMBER = '  99128289  ';
    process.env.SUN_1_ACCOUNT_NAME = '  Holder-GO2  ';
    process.env.SUN_1_BANK_NAME = '  Bank-WP5A  ';

    const suns = loadSunsFromEnv();

    expect(suns[0]).toEqual({
      sunNumber: '510001',
      sunName: 'TMS FM',
      sortCode: '106057',
      accountNumber: '99128289',
      accountName: 'Holder-GO2',
      bankName: 'Bank-WP5A',
    });
  });

  it('should stop loading when encountering a gap in SUN numbers', () => {
    process.env.SUN_1_SUN_NUMBER = '510001';
    process.env.SUN_1_SUN_NAME = 'TMS FM';
    process.env.SUN_1_SORT_CODE = '106057';
    process.env.SUN_1_ACCOUNT_NUMBER = '99128289';
    process.env.SUN_1_ACCOUNT_NAME = 'Holder-GO2';
    process.env.SUN_1_BANK_NAME = 'Bank-WP5A';

    // SUN_2 is missing (gap)

    process.env.SUN_3_SUN_NUMBER = '510003';
    process.env.SUN_3_SUN_NAME = 'TMS FM3';
    process.env.SUN_3_SORT_CODE = '132500';
    process.env.SUN_3_ACCOUNT_NUMBER = '43258335';
    process.env.SUN_3_ACCOUNT_NAME = 'Holder-ZEW';
    process.env.SUN_3_BANK_NAME = 'Bank-S0NH';

    const suns = loadSunsFromEnv();

    // Should only load SUN_1, then stop at the gap
    expect(suns).toHaveLength(1);
    expect(suns[0].sunName).toBe('TMS FM');
  });

  it('should throw error when SUN_N_SUN_NUMBER exists but other fields are missing', () => {
    process.env.SUN_1_SUN_NUMBER = '510001';
    process.env.SUN_1_SUN_NAME = 'TMS FM';
    // Missing other fields

    expect(() => loadSunsFromEnv()).toThrow(/Incomplete SUN configuration for SUN_1/);
  });

  it('should throw error with all missing field names', () => {
    process.env.SUN_1_SUN_NUMBER = '510001';
    // Missing all other fields

    expect(() => loadSunsFromEnv()).toThrow(
      /Incomplete SUN configuration for SUN_1.*SUN_1_SUN_NAME.*SUN_1_SORT_CODE.*SUN_1_ACCOUNT_NUMBER.*SUN_1_ACCOUNT_NAME.*SUN_1_BANK_NAME/
    );
  });

  it('should handle mixed valid and invalid configurations correctly', () => {
    process.env.SUN_1_SUN_NUMBER = '510001';
    process.env.SUN_1_SUN_NAME = 'TMS FM';
    process.env.SUN_1_SORT_CODE = '106057';
    process.env.SUN_1_ACCOUNT_NUMBER = '99128289';
    process.env.SUN_1_ACCOUNT_NAME = 'Holder-GO2';
    process.env.SUN_1_BANK_NAME = 'Bank-WP5A';

    process.env.SUN_2_SUN_NUMBER = '510002';
    // Missing other fields for SUN_2

    expect(() => loadSunsFromEnv()).toThrow(/Incomplete SUN configuration for SUN_2/);
  });

  it('should start from SUN_1 (not SUN_0)', () => {
    process.env.SUN_0_SUN_NUMBER = '510000';
    process.env.SUN_0_SUN_NAME = 'Zero SUN';
    process.env.SUN_0_SORT_CODE = '999999';
    process.env.SUN_0_ACCOUNT_NUMBER = '99999999';
    process.env.SUN_0_ACCOUNT_NAME = 'Zero Holder';
    process.env.SUN_0_BANK_NAME = 'Zero Bank';

    process.env.SUN_1_SUN_NUMBER = '510001';
    process.env.SUN_1_SUN_NAME = 'TMS FM';
    process.env.SUN_1_SORT_CODE = '106057';
    process.env.SUN_1_ACCOUNT_NUMBER = '99128289';
    process.env.SUN_1_ACCOUNT_NAME = 'Holder-GO2';
    process.env.SUN_1_BANK_NAME = 'Bank-WP5A';

    const suns = loadSunsFromEnv();

    // Should only load SUN_1, not SUN_0
    expect(suns).toHaveLength(1);
    expect(suns[0].sunNumber).toBe('510001');
  });

  it('should handle sequential numbering correctly', () => {
    // Set up SUNs 1-5
    for (let i = 1; i <= 5; i++) {
      process.env[`SUN_${i}_SUN_NUMBER`] = `51000${i}`;
      process.env[`SUN_${i}_SUN_NAME`] = `TMS FM${i}`;
      process.env[`SUN_${i}_SORT_CODE`] = `10000${i}`;
      process.env[`SUN_${i}_ACCOUNT_NUMBER`] = `${i}0000000`;
      process.env[`SUN_${i}_ACCOUNT_NAME`] = `Holder-${i}`;
      process.env[`SUN_${i}_BANK_NAME`] = `Bank-${i}`;
    }

    const suns = loadSunsFromEnv();

    expect(suns).toHaveLength(5);
    suns.forEach((sun, idx) => {
      expect(sun.sunNumber).toBe(`51000${idx + 1}`);
      expect(sun.sunName).toBe(`TMS FM${idx + 1}`);
    });
  });
});
