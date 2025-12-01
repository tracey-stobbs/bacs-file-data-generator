#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { ensureSeeded } from '../lib/utils/seed.js';
import type { GenerationRequest, OriginatingAccountDetails } from '../types.js';

function printHelp(): void {
  console.log(
    [
      'BACS File Data Generator CLI',
      '',
      'Usage:',
      '  ts-node src/cli/generate.ts --fileType <EaziPay|SDDirect|Bacs18> [options]',
      '',
      'Options:',
      '  --fileType=<name>           File type to generate (EaziPay currently supported)',
      '  --rows=<n>                  Number of rows to generate (default 10)',
      '  --invalid                   Include invalid rows (default false)',
      '  --faker-seed=<seed>         Seed for faker to make output deterministic',
      '  --outputRoot=<path>         Output directory (default ./output)',
      '  --originating.sortCode=<NNNNNN>    Override originating.sortCode',
      '  --originating.accountNumber=<NNNNNNNN>  Override originating.accountNumber',
      '  --originating.accountName=<name>   Override originating.accountName',
      '  --help, -h                  Show this help',
      '',
      'Examples:',
      '  npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --faker-seed=1234',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): {
  fileType: string | undefined;
  numberOfRows: number;
  hasInvalidRows?: boolean;
  fakerSeed?: string | number;
  outputRoot: string;
  originating?: Record<string, string>;
} {
  const opts: {
    fileType?: string;
    numberOfRows: number;
    hasInvalidRows?: boolean;
    fakerSeed?: string | number;
    outputRoot: string;
    originating?: Record<string, string>;
  } = { numberOfRows: 10, outputRoot: './output' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
    if (a.startsWith('--fileType=')) opts.fileType = a.split('=')[1];
    else if (a.startsWith('--rows=')) opts.numberOfRows = Number(a.split('=')[1]);
    else if (a === '--invalid') opts.hasInvalidRows = true;
    else if (a.startsWith('--faker-seed=')) opts.fakerSeed = a.split('=')[1];
    else if (a.startsWith('--outputRoot=')) opts.outputRoot = a.split('=')[1];
    else if (a.startsWith('--originating.')) {
      const [k, v] = a.substring('--originating.'.length).split('=');
      if (!opts.originating) opts.originating = {};
      opts.originating[k] = v;
    }
  }
  if (!opts.fileType) {
    console.error('Missing --fileType');
    printHelp();
    process.exit(1);
  }
  return opts as {
    fileType: string | undefined;
    numberOfRows: number;
    hasInvalidRows?: boolean;
    fakerSeed?: string | number;
    outputRoot: string;
    originating?: Record<string, string>;
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (opts.fakerSeed) process.env.FAKER_SEED = String(opts.fakerSeed);

  // Apply seed early so any code that runs during generation is deterministic.
  ensureSeeded();

  // Build a typed GenerationRequest. We validate fileType at runtime to narrow the union.
  if (!opts.fileType || opts.fileType !== 'EaziPay') {
    console.error('Only EaziPay fileType is supported in this CLI');
    process.exit(1);
  }

  const req: GenerationRequest = {
    fileType: 'EaziPay',
    numberOfRows: opts.numberOfRows,
    hasInvalidRows: !!opts.hasInvalidRows,
    originating: (opts.originating as unknown as OriginatingAccountDetails) || undefined,
    // outputRoot is not part of GenerationRequest but generators accept it via options in some codepaths; keep as workaround if needed
  };

  try {
    await runCli({
      fileType: req.fileType,
      numberOfRows: req.numberOfRows,
      fakerSeed: opts.fakerSeed,
      outputRoot: opts.outputRoot,
      originating: req.originating as unknown as Record<string, string> | undefined,
    });
  } catch (err: unknown) {
    // Narrow unknown to extract message if present
    const msg =
      typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    console.error('Generation failed:', msg);
    process.exit(2);
  }
}

export type RunCliOptions = {
  fileType: string;
  numberOfRows?: number;
  fakerSeed?: string | number;
  outputRoot?: string;
  originating?: Record<string, string>;
};

export async function runCli(options: RunCliOptions): Promise<{ filePath: string; rows: number }> {
  if (options.fakerSeed) process.env.FAKER_SEED = String(options.fakerSeed);
  ensureSeeded();

  if (!options.fileType || options.fileType !== 'EaziPay') {
    throw new Error('Only EaziPay fileType is supported in this CLI');
  }

  // Dynamically import the compiled JS module (ts-node/esm resolver expects .js imports in source)
  // When running under Vitest this import resolves to the TS source via ts-node hooks.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import('../lib/generateCsv.js');
  const gen = mod.generateCsv({
    reportType: 'eazipay',
    numberOfRows: options.numberOfRows,
    originating: options.originating as unknown as {
      sortCode?: string;
      accountNumber?: string;
      accountName?: string;
    },
  });

  const outRoot = options.outputRoot || './output';
  if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
  const filename = `${options.fileType.toLowerCase()}-${Date.now()}.csv`;
  const filePath = path.resolve(outRoot, filename);
  fs.writeFileSync(filePath, gen.csv, 'utf8');
  return { filePath, rows: gen.rows.length };
}

// Run main when executed as a script. Support both CommonJS and ESM entry checks so
// the compiled `dist/cli/generate.js` (ESM) can be executed directly with `node`.
async function runIfEntryPoint(): Promise<void> {
  try {
    // CJS style: try to access a global require (available in CommonJS environments)
    try {
      const maybeRequire = (globalThis as unknown as { require?: unknown }).require;
      if (typeof maybeRequire === 'function') {
        // Access require.main safely
        const req: unknown = maybeRequire;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((req as any).main === module) {
          await main();
          return;
        }
      }
    } catch {
      // ignore - not a CJS environment
    }

    // ESM style: compare import.meta.url to the invoked script path
    const { fileURLToPath } = await import('url');
    if (fileURLToPath(import.meta.url) === process.argv[1]) {
      await main();
    }
  } catch (err) {
    // If anything goes wrong here, just surface the error and exit
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(99);
  }
}

void runIfEntryPoint();
