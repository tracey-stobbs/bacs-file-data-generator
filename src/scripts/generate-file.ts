import { generateFile } from '../lib/factory.js';
import { loadSunsFromEnv } from '../lib/config/envClientLoader.js';
import type { GenerationRequest, OriginatingAccountDetails, SupportedFileType } from '../types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Load .env file if it exists
function loadEnvFile() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = resolve(__filename, '..');
  const envPath = resolve(__dirname, '../../.env');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  } catch (e) {
    // .env file is optional
  }
}

loadEnvFile();

type ParsedArgs = Record<string, string | boolean>;

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const trimmed = raw.slice(2);
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      args[trimmed] = true;
    } else {
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      args[key] = value;
    }
  }
  return args;
}

function parseNumber(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && /^-?\d+$/.test(val)) return Number(val);
  return undefined;
}

function parseString(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() !== '' ? val : undefined;
}

function usage(): void {
  const lines = [
    'Usage:',
    '  npm run generate-file -- --fileType=Bacs18PaymentLines --rows=10 --originating.sortCode=123456 --originating.accountNumber=12345678 --originating.accountName="ACME LTD"',
    '',
    'Multi-SUN generation (Bacs18PaymentLines only):',
    '  Set SUN_N_* environment variables and omit --originating.* args:',
    '  SUN_1_SUN_NUMBER=510001',
    '  SUN_1_SUN_NAME=TMS FM',
    '  SUN_1_SORT_CODE=106057',
    '  SUN_1_ACCOUNT_NUMBER=99128289',
    '  SUN_1_ACCOUNT_NAME=Holder-GO2',
    '  SUN_1_BANK_NAME=Bank-WP5A',
    '',
    '  Then run: npm run generate-file -- --fileType=Bacs18PaymentLines --rows=10',
    '  (Generates one DAILY file per SUN)',
    '',
    'Optional:',
    '  --faker-seed=1234',
    '  --fixedTimestamp=1700000000000',
    '  --invalid',
    '  --bacs18Type=DAILY|MULTI',
  ];
  console.log(lines.join('\n'));
}

function buildOriginating(args: ParsedArgs): OriginatingAccountDetails {
  return {
    sortCode: parseString(args['originating.sortCode']),
    accountNumber: parseString(args['originating.accountNumber']),
    accountName: parseString(args['originating.accountName']),
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  usage();
  process.exit(0);
}

const fileType = parseString(args.fileType) as SupportedFileType | undefined;
const rows = parseNumber(args.rows);
if (!fileType || !rows) {
  usage();
  process.exit(1);
}

const hasInvalidRows = !!args.invalid || !!args.hasInvalidRows;
const fakerSeed = parseNumber(args['faker-seed'] ?? args.fakerSeed);
const fixedTimestamp = parseNumber(args.fixedTimestamp ?? args['fixed-timestamp']);
const sun = parseString(args.sun);

const baseReq: GenerationRequest = {
  fileType,
  numberOfRows: rows,
  hasInvalidRows: hasInvalidRows || undefined,
  sun: sun || undefined,
} as GenerationRequest;

const originating = buildOriginating(args);

let req: GenerationRequest;
if (fileType === 'Bacs18PaymentLines') {
  const hasOriginatingDetails = !!(
    originating.sortCode &&
    originating.accountNumber &&
    originating.accountName
  );

  // Multi-SUN generation: If no originating details provided, load from env config
  if (!hasOriginatingDetails) {
    const suns = loadSunsFromEnv();

    if (suns.length > 0) {
      // Multi-SUN mode: generate one file per SUN with DAILY type
      console.log(
        `Generating ${suns.length} Bacs18PaymentLines files from SUN environment config...`
      );
      const results: string[] = [];

      for (const sun of suns) {
        const sunReq: GenerationRequest = {
          ...baseReq,
          fileType,
          bacs18Type: 'DAILY', // Force DAILY type for env-based multi-SUN generation
          originating: {
            sortCode: sun.sortCode,
            accountNumber: sun.accountNumber,
            accountName: sun.accountName,
          },
          clientIdentifier: sun.sunName, // Use sunName for file naming
          sun: sun.sunNumber, // Include SUN number in metadata
        };

        try {
          const result = await generateFile({
            ...sunReq,
            fakerSeed,
            fixedTimestamp,
          } as GenerationRequest & { fakerSeed?: number; fixedTimestamp?: number });
          results.push(result.filePath);
          console.log(`  ✓ ${sun.sunName} (${sun.sunNumber}): ${result.filePath}`);
        } catch (err) {
          console.error(
            `  ✗ ${sun.sunName} (${sun.sunNumber}):`,
            err instanceof Error ? err.message : String(err)
          );
          process.exit(1);
        }
      }

      console.log(`\nSuccessfully generated ${results.length} file(s)`);
      process.exit(0);
    } else {
      // No env config found, require explicit originating details
      console.error(
        'ERROR: Bacs18PaymentLines requires originating.sortCode, originating.accountNumber, originating.accountName'
      );
      console.error('       OR set up SUN_N_* environment variables for multi-SUN generation');
      process.exit(1);
    }
  }

  // Single-file mode: explicit originating details provided (preserves MULTI default)
  req = {
    ...baseReq,
    fileType,
    bacs18Type: parseString(args.bacs18Type) as 'DAILY' | 'MULTI' | undefined,
    originating: {
      sortCode: originating.sortCode as string,
      accountNumber: originating.accountNumber as string,
      accountName: originating.accountName as string,
    },
  };
} else if (fileType === 'SDDirect') {
  req = {
    ...baseReq,
    fileType,
    includeOptionalFields: !!args.includeOptionalFields,
    originating:
      originating.sortCode || originating.accountNumber || originating.accountName
        ? originating
        : undefined,
  } as GenerationRequest;
} else {
  const allowedTransactionCodes = parseString(args.allowedTransactionCodes)
    ?.split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  req = {
    ...baseReq,
    fileType,
    dateFormat: parseString(args.dateFormat),
    allowedTransactionCodes:
      allowedTransactionCodes && allowedTransactionCodes.length
        ? allowedTransactionCodes
        : undefined,
    processingDate: parseString(args.processingDate),
    originating:
      originating.sortCode || originating.accountNumber || originating.accountName
        ? originating
        : undefined,
  } as GenerationRequest;
}

try {
  const result = await generateFile({
    ...(req as GenerationRequest),
    fakerSeed,
    fixedTimestamp,
  } as GenerationRequest & { fakerSeed?: number; fixedTimestamp?: number });
  console.log(result.filePath);
} catch (err) {
  console.error('ERROR:', err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error('Stack:', err.stack);
  }
  process.exit(1);
}
