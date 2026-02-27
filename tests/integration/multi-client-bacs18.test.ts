import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Multi-SUN Bacs18 generation integration', () => {
  const outRoot = path.resolve(__dirname, '../../output/test-multi-sun');
  const originalEnv = process.env;

  beforeEach(() => {
    // Clean output directory
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }

    // Set up environment
    process.env = { ...originalEnv };
    process.env.OUTPUT_ROOT = outRoot;
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
    process.env = originalEnv;
  });

  it('should generate multiple files when SUN_N_* env vars are set', () => {
    // Set up 2 SUNs in environment
    const env = {
      ...process.env,
      SUN_1_SUN_NUMBER: '510001',
      SUN_1_SUN_NAME: 'TMS FM',
      SUN_1_SORT_CODE: '106057',
      SUN_1_ACCOUNT_NUMBER: '99128289',
      SUN_1_ACCOUNT_NAME: 'Holder-GO2',
      SUN_1_BANK_NAME: 'Bank-WP5A',
      SUN_2_SUN_NUMBER: '510002',
      SUN_2_SUN_NAME: 'TMS FM2',
      SUN_2_SORT_CODE: '128880',
      SUN_2_ACCOUNT_NUMBER: '64380990',
      SUN_2_ACCOUNT_NAME: 'Holder-JLY',
      SUN_2_BANK_NAME: 'Bank-ISUE',
      OUTPUT_ROOT: outRoot,
    };

    // Run CLI without --originating args to trigger multi-SUN mode
    execSync(
      'node --loader ts-node/esm src/scripts/generate-file.ts --fileType=Bacs18PaymentLines --rows=5 --faker-seed=1234',
      {
        cwd: path.resolve(__dirname, '../../'),
        env,
        stdio: 'inherit',
      }
    );

    // Verify output folder exists
    const bacs18Dir = path.join(outRoot, 'file-data-generator', 'Bacs18PaymentLines');
    expect(fs.existsSync(bacs18Dir)).toBe(true);

    // Get all generated files
    const files = fs.readdirSync(bacs18Dir);

    // Should have 2 files (one per SUN)
    expect(files.length).toBe(2);

    // Verify filenames contain SUN identifiers (sunName)
    const tmsFmFile = files.find((f) => f.includes('TMS-FM'));
    const tmsFm2File = files.find((f) => f.includes('TMS-FM2'));

    expect(tmsFmFile).toBeTruthy();
    expect(tmsFm2File).toBeTruthy();

    // Verify files have content
    const tmsFmContent = fs.readFileSync(path.join(bacs18Dir, tmsFmFile as string), 'utf-8');
    const tmsFm2Content = fs.readFileSync(path.join(bacs18Dir, tmsFm2File as string), 'utf-8');

    expect(tmsFmContent.split('\n').filter((l) => l.trim()).length).toBe(5);
    expect(tmsFm2Content.split('\n').filter((l) => l.trim()).length).toBe(5);

    // Verify each file uses the correct originating account details
    expect(tmsFmContent).toContain('106057'); // TMS FM sort code
    expect(tmsFmContent).toContain('99128289'); // TMS FM account number

    expect(tmsFm2Content).toContain('128880'); // TMS FM2 sort code
    expect(tmsFm2Content).toContain('64380990'); // TMS FM2 account number
  }, 30000);

  it('should generate DAILY type files for multi-SUN mode', () => {
    const env = {
      ...process.env,
      SUN_1_SUN_NUMBER: '510001',
      SUN_1_SUN_NAME: 'TMS FM',
      SUN_1_SORT_CODE: '106057',
      SUN_1_ACCOUNT_NUMBER: '99128289',
      SUN_1_ACCOUNT_NAME: 'Holder-GO2',
      SUN_1_BANK_NAME: 'Bank-WP5A',
      OUTPUT_ROOT: outRoot,
    };

    execSync(
      'node --loader ts-node/esm src/scripts/generate-file.ts --fileType=Bacs18PaymentLines --rows=3 --faker-seed=5678',
      {
        cwd: path.resolve(__dirname, '../../'),
        env,
        stdio: 'inherit',
      }
    );

    const bacs18Dir = path.join(outRoot, 'file-data-generator', 'Bacs18PaymentLines');
    const files = fs.readdirSync(bacs18Dir);
    const file = files.find((f) => f.includes('TMS-FM'));

    expect(file).toBeTruthy();

    const content = fs.readFileSync(path.join(bacs18Dir, file as string), 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    // For DAILY type, processing date field should be blank (6 spaces)
    // Processing date is at position 100-105 (0-indexed) in the Bacs18 format
    lines.forEach((line) => {
      const processingDateField = line.substring(100, 106);
      expect(processingDateField).toBe('      '); // 6 spaces for DAILY type
    });
  }, 30000);

  it('should generate single file with MULTI default when originating args provided', () => {
    // Set up env config (should be ignored when explicit args provided)
    const env = {
      ...process.env,
      SUN_1_SUN_NUMBER: '999999',
      SUN_1_SUN_NAME: 'Ignored SUN',
      SUN_1_SORT_CODE: '999999',
      SUN_1_ACCOUNT_NUMBER: '99999999',
      SUN_1_ACCOUNT_NAME: 'Ignored',
      SUN_1_BANK_NAME: 'Ignored Bank',
      OUTPUT_ROOT: outRoot,
    };

    // Run with explicit --originating args
    execSync(
      'node --loader ts-node/esm src/scripts/generate-file.ts --fileType=Bacs18PaymentLines --rows=3 ' +
        '--originating.sortCode=123456 --originating.accountNumber=12345678 --originating.accountName="TEST CLIENT" ' +
        '--faker-seed=9999',
      {
        cwd: path.resolve(__dirname, '../../'),
        env,
        stdio: 'inherit',
      }
    );

    const bacs18Dir = path.join(outRoot, 'file-data-generator', 'Bacs18PaymentLines');
    const files = fs.readdirSync(bacs18Dir);

    // Should have only 1 file
    expect(files.length).toBe(1);

    // Filename should NOT contain 'Ignored'
    expect(files[0]).not.toContain('Ignored');

    // Content should use provided originating details
    const content = fs.readFileSync(path.join(bacs18Dir, files[0]), 'utf-8');
    expect(content).toContain('123456');
    expect(content).toContain('12345678');

    // Should be MULTI type by default (not DAILY) - processing date should NOT be blank
    const lines = content.split('\n').filter((l) => l.trim());
    const firstLineProcessingDate = lines[0].substring(100, 106);
    expect(firstLineProcessingDate).not.toBe('      '); // Should have Julian date, not blank
    expect(firstLineProcessingDate).toMatch(/^ \d{5}$/); // Format: space + YYDDD
  }, 30000);

  it('should error when no env config and no originating args', () => {
    const env: Record<string, string> = {
      ...process.env,
      OUTPUT_ROOT: outRoot,
    } as Record<string, string>;

    // Clear any SUN_* env vars
    Object.keys(env).forEach((key) => {
      if (key.startsWith('SUN_')) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete env[key];
      }
    });

    // Should error because no originating details and no env config
    expect(() => {
      execSync(
        'node --loader ts-node/esm src/scripts/generate-file.ts --fileType=Bacs18PaymentLines --rows=3',
        {
          cwd: path.resolve(__dirname, '../../'),
          env,
          stdio: 'pipe',
        }
      );
    }).toThrow();
  }, 20000);
});
