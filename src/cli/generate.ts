#!/usr/bin/env ts-node
import fs from "fs";
import { generateFile } from "../index.js";
import { ensureSeeded } from "../lib/utils/seed.js";
import type { GenerationRequest, OriginatingAccountDetails } from "../types.js";

function printHelp(): void {
  console.log(
    [
      "BACS File Data Generator CLI",
      "",
      "Usage:",
      "  ts-node src/cli/generate.ts --fileType <EaziPay|SDDirect|Bacs18> [options]",
      "",
      "Options:",
      "  --fileType=<name>           File type to generate (EaziPay currently supported)",
      "  --rows=<n>                  Number of rows to generate (default 10)",
      "  --invalid                   Include invalid rows (default false)",
      "  --faker-seed=<seed>         Seed for faker to make output deterministic",
      "  --outputRoot=<path>         Output directory (default ./output)",
      "  --originating.sortCode=<NNNNNN>    Override originating.sortCode",
      "  --originating.accountNumber=<NNNNNNNN>  Override originating.accountNumber",
      "  --originating.accountName=<name>   Override originating.accountName",
      "  --help, -h                  Show this help",
      "",
      "Examples:",
      "  npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --faker-seed=1234",
    ].join("\n"),
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
  } = { numberOfRows: 10, outputRoot: "./output" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
    if (a.startsWith("--fileType=")) opts.fileType = a.split("=")[1];
    else if (a.startsWith("--rows="))
      opts.numberOfRows = Number(a.split("=")[1]);
    else if (a === "--invalid") opts.hasInvalidRows = true;
    else if (a.startsWith("--faker-seed=")) opts.fakerSeed = a.split("=")[1];
    else if (a.startsWith("--outputRoot=")) opts.outputRoot = a.split("=")[1];
    else if (a.startsWith("--originating.")) {
      const [k, v] = a.substring("--originating.".length).split("=");
      if (!opts.originating) opts.originating = {};
      opts.originating[k] = v;
    }
  }
  if (!opts.fileType) {
    console.error("Missing --fileType");
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
  if (!opts.fileType || opts.fileType !== "EaziPay") {
    console.error("Only EaziPay fileType is supported in this CLI");
    process.exit(1);
  }

  const req: GenerationRequest = {
    fileType: "EaziPay",
    numberOfRows: opts.numberOfRows,
    hasInvalidRows: !!opts.hasInvalidRows,
    originating:
      (opts.originating as unknown as OriginatingAccountDetails) || undefined,
    // outputRoot is not part of GenerationRequest but generators accept it via options in some codepaths; keep as workaround if needed
  };

  try {
    const result = await generateFile(req);
    console.log("Generated file:");
    console.log(JSON.stringify(result, null, 2));
    // Print created file content path and first few lines if available
    if (result?.filePath && fs.existsSync(result.filePath)) {
      const content = fs.readFileSync(result.filePath, "utf8");
      console.log("\n--- file preview ---");
      console.log(content.split(/\r?\n/).slice(0, 30).join("\n"));
    }
  } catch (err: unknown) {
    // Narrow unknown to extract message if present
    const msg =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    console.error("Generation failed:", msg);
    process.exit(2);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(99);
});
