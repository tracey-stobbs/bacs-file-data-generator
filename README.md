# file-data-generator HTTP Wrapper (Milestone 2)

Adds an optional lightweight Fastify HTTP server exposing the library generation capability.

## Output Configuration

All generated files are written to `OUTPUT_ROOT` (default: `./output`), with files organized by file type:

```
OUTPUT_ROOT/file-data-generator/
├── EaziPay/
│   ├── 2025-01-24-14-30-45-EaziPay-100.csv
│   └── 2025-01-24-14-30-45-EaziPay-50.csv
├── SDDirect/
│   └── 2025-01-24-14-30-45-SDDirect-100.csv
└── Bacs18PaymentLines/
    └── 2025-01-24-14-30-45-Bacs18PaymentLines-75.txt
```

For detailed output structure and configuration, see [OUTPUT.md](./OUTPUT.md).

### Setting OUTPUT_ROOT

Create `.env` in the workspace root:

```env
OUTPUT_ROOT=./output
```

Or set via environment variable:

```bash
export OUTPUT_ROOT=/custom/path
npm run dev
```

## Multi-Client Generation (Bacs18PaymentLines)

The CLI supports generating multiple Bacs18PaymentLines files from a single command using environment-based SUN configuration. This feature is designed for batch generation scenarios where you need to create files for multiple SUNs.

### Configuration

Set up SUN configurations using environment variables with the pattern `SUN_N_*`:

```env
# SUN 1
SUN_1_SUN_NUMBER=510001
SUN_1_SUN_NAME=TMS FM
SUN_1_SORT_CODE=106057
SUN_1_ACCOUNT_NUMBER=99128289
SUN_1_ACCOUNT_NAME=Holder-GO2
SUN_1_BANK_NAME=Bank-WP5A

# SUN 2
SUN_2_SUN_NUMBER=510002
SUN_2_SUN_NAME=TMS FM2
SUN_2_SORT_CODE=128880
SUN_2_ACCOUNT_NUMBER=64380990
SUN_2_ACCOUNT_NAME=Holder-JLY
SUN_2_BANK_NAME=Bank-ISUE

# SUN 3
SUN_3_SUN_NUMBER=510003
SUN_3_SUN_NAME=TMS FM3
SUN_3_SORT_CODE=132500
SUN_3_ACCOUNT_NUMBER=43258335
SUN_3_ACCOUNT_NAME=Holder-ZEW
SUN_3_BANK_NAME=Bank-S0NH
```

**Rules:**

- SUN numbering starts at 1 (not 0)
- Sequential numbering (gaps stop loading)
- All six fields required for each SUN
- SUN names are sanitized for use in filenames

### Available SUNs

| SUN    | Sun Name | Sort Code | Account Number | Account Name | Bank Name |
| ------ | -------- | --------- | -------------- | ------------ | --------- |
| 510001 | TMS FM   | 106057    | 99128289       | Holder-GO2   | Bank-WP5A |
| 510002 | TMS FM2  | 128880    | 64380990       | Holder-JLY   | Bank-ISUE |
| 510003 | TMS FM3  | 132500    | 43258335       | Holder-ZEW   | Bank-S0NH |
| 510004 | TMS FM4  | 141635    | 19458259       | Holder-KED   | Bank-2S7I |
| 510005 | TMS FM5  | 161468    | 89933237       | Holder-GBE   | Bank-U9WR |
| 510101 | TMS OWN  | 111030    | 85055071       | Holder-10K   | Bank-SHR9 |
| 510102 | TMS OWN2 | 133213    | 40469964       | Holder-3JL   | Bank-LP3D |

### Usage

Generate files for all configured SUNs:

```bash
npm run generate-file -- --fileType=Bacs18PaymentLines --rows=10
```

This will:

1. Detect no `--originating.*` arguments were provided
2. Load SUN configurations from environment variables
3. Generate one DAILY-type file per SUN
4. Use sanitized SUN name in each filename:
   - `2026-02-24-14-30-00-Bacs18PaymentLines_TMS-FM-10.txt`
   - `2026-02-24-14-30-00-Bacs18PaymentLines_TMS-FM2-10.txt`
   - `2026-02-24-14-30-00-Bacs18PaymentLines_TMS-FM3-10.txt`

### Single-File Mode (Override)

Providing explicit `--originating.*` arguments bypasses multi-SUN mode and generates a single file:

```bash
npm run generate-file -- --fileType=Bacs18PaymentLines --rows=10 \
  --originating.sortCode=999999 \
  --originating.accountNumber=88888888 \
  --originating.accountName="Single Client"
```

This preserves backward compatibility and allows explicit control when needed.

### File Type Behavior

| Mode                        | Type Default | Processing Date  | Behavior         |
| --------------------------- | ------------ | ---------------- | ---------------- |
| Multi-SUN (env config)      | DAILY        | Blank (6 spaces) | Batch generation |
| Single-file (explicit args) | MULTI        | Julian date      | Current behavior |
| Library API                 | MULTI        | Julian date      | Unchanged        |

**Note:** Multi-SUN generation is CLI-only. The library `generateFile()` API remains single-file oriented.

## Endpoint

`POST /generate-file`

Request JSON body:

```
{
  "fileType": "EaziPay",
  "rows": 25,
  "seed": 1234,            // optional deterministic seed
  "processingDate": "2025-11-10", // optional ISO date (currently validated then ignored for EaziPay)
  "originating": {         // optional origin account hints
    "sortCode": "401726",
    "accountNumber": "51779109",
    "accountName": "ORIGIN"
  },
  "hasInvalidRows": true   // optional: inject invalid rows (handled by generator)
}
```

Responses:

- `200 text/csv` with file content (EaziPay only at present)
- `400` validation errors `{ error, detail? }`
- `501` unsupported file type
- `500` generation failure

## Deterministic Seeding

If `seed` provided: sets `process.env.FAKER_SEED` and invokes `faker.seed(seed)` before generation for reproducible output. Omitted seed => non-deterministic.

## Running

### Quick Start

Development (TypeScript live):

```bash
npm run dev-server # listens on port 3002 (override PORT env var if needed)
```

Production-style (built dist):

```bash
npm run build
npm run start:generator
```

Generate deterministic sample:

```bash
curl -X POST http://localhost:3002/generate-file -H "Content-Type: application/json" \
  -d '{"fileType":"EaziPay","rows":5,"seed":1234}' -o eazipay.csv
```

Validation: the resulting CSV now always ends with a trailing newline so `wc -l eazipay.csv` equals the requested row count.

## Filename Format

All generated files use a standardized timestamp-based naming convention:

```
<YYYY-MM-DD-HH-mm-ss>-<FileType>-<RowCount>.<ext>
2025-01-24-14-30-45-EaziPay-100.csv
```

Timestamps use ISO 8601 format with minute precision, enabling chronological sorting.

## Future Expansion

Planned fileTypes: BACS18, PaymentLines, SDDirect. Until implemented, they return 501. The façade service (separate repo) can start both this generator and the report API concurrently. Example combined start (after building both):

```bash
pushd ../bacs-file-data-generator && npm run start:generator &
pushd ../bacs-report-api && npm run start:report &
wait
```

Use a process manager (e.g. `npm-run-all -p`) if you prefer a single aggregated script.

## Testing

Vitest tests include deterministic seed assertions in `tests/http-generate-file.spec.ts`. Route logic is now in `src/http/routes/generateFileRoute.ts` for reuse (e.g. Façade orchestration).

Test output is automatically cleaned up after tests complete. See [OUTPUT.md](./OUTPUT.md) for cleanup details.

Test output is automatically cleaned up after tests complete. See [OUTPUT.md](./OUTPUT.md) for cleanup details.
