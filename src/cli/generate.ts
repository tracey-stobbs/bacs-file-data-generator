#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { generateFile } from '../index.js';
import type { GenerationRequest } from '../types.js';

function printHelp() {
	console.log([
		'BACS File Data Generator CLI',
		'',
		'Usage:',
		'  ts-node src/cli/generate.ts --fileType <EaziPay|SDDirect|Bacs18> [options]',
		'',
		'Options:',
		"  --fileType=<name>           File type to generate (EaziPay currently supported)",
		"  --rows=<n>                  Number of rows to generate (default 10)",
		"  --invalid                   Include invalid rows (default false)",
		"  --faker-seed=<seed>         Seed for faker to make output deterministic",
		"  --outputRoot=<path>         Output directory (default ./output)",
		"  --originating.sortCode=<NNNNNN>    Override originating.sortCode",
		"  --originating.accountNumber=<NNNNNNNN>  Override originating.accountNumber",
		"  --originating.accountName=<name>   Override originating.accountName",
		"  --help, -h                  Show this help",
		'',
		'Examples:',
		"  npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --faker-seed=1234",
	].join('\n'));
}

function parseArgs(argv: string[]) {
	const opts: any = { numberOfRows: 10, outputRoot: './output' };
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
	return opts as any;
}

async function main() {
	const opts = parseArgs(process.argv);
	if (opts.fakerSeed) process.env.FAKER_SEED = String(opts.fakerSeed);

	const req: any = {
		fileType: opts.fileType,
		numberOfRows: opts.numberOfRows,
		hasInvalidRows: !!opts.hasInvalidRows,
		originating: opts.originating,
		outputRoot: opts.outputRoot,
	};

	try {
		const result = await generateFile(req);
		console.log('Generated file:');
		console.log(JSON.stringify(result, null, 2));
		// Print created file content path and first few lines if available
		if (result?.filePath && fs.existsSync(result.filePath)) {
			const content = fs.readFileSync(result.filePath, 'utf8');
			console.log('\n--- file preview ---');
			console.log(content.split(/\r?\n/).slice(0, 30).join('\n'));
		}
	} catch (err: any) {
		console.error('Generation failed:', err?.message ?? String(err));
		process.exit(2);
	}
}

main().catch(err => { console.error(err); process.exit(99); });
