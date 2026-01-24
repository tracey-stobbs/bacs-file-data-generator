# Output Structure & File Naming

## Overview

The **file-data-generator** package produces BACS test data files in multiple formats. All output is organized by file type under the shared `OUTPUT_ROOT` directory with timestamp-based naming for easy chronological tracking.

## Output Location

**Base Path:** `${OUTPUT_ROOT}/file-data-generator/`

Files are organized by type in subdirectories:
- `EaziPay/` — CSV files for EaziPay format (random .csv or .txt)
- `SDDirect/` — CSV files for SDDirect format
- `Bacs18PaymentLines/` — Text files for Bacs18 format

## File Naming Convention

**Format:** `YYYY-MM-DD-HH-mm-ss-<FileType>-<RowCount>.<ext>`

**Example:**
```
2025-01-24-14-30-45-EaziPay-100.csv
2025-01-24-14-30-45-SDDirect-50.csv
2025-01-24-14-30-45-Bacs18PaymentLines-75.txt
```

**Components:**
- `YYYY-MM-DD-HH-mm-ss` — ISO 8601 timestamp with minute precision (e.g., `2025-01-24-14-30-45`)
- `FileType` — The file type being generated (EaziPay, SDDirect, Bacs18PaymentLines)
- `RowCount` — Number of data rows in the file
- `ext` — File extension (.csv, .txt)

## Example Output Directory Tree

```
./output/file-data-generator/
├── EaziPay/
│   ├── 2025-01-24-14-25-10-EaziPay-100.csv
│   ├── 2025-01-24-14-25-10-EaziPay-250.txt
│   └── 2025-01-24-14-30-45-EaziPay-100.csv
├── SDDirect/
│   ├── 2025-01-24-14-25-15-SDDirect-50.csv
│   └── 2025-01-24-14-30-50-SDDirect-75.csv
└── Bacs18PaymentLines/
    ├── 2025-01-24-14-25-20-Bacs18PaymentLines-100.txt
    └── 2025-01-24-14-30-55-Bacs18PaymentLines-50.txt
```

## Configuration

### Setting OUTPUT_ROOT

**Via .env file (recommended):**
```bash
# Create .env in workspace root
OUTPUT_ROOT=./output
```

**Via environment variable:**
```bash
export OUTPUT_ROOT=/path/to/output
npm run dev
```

**Default:** If `OUTPUT_ROOT` is not set, the package uses `./output` relative to the workspace root.

## Usage Examples

### CLI Generation

```bash
# Generate EaziPay file with deterministic seed
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=100 --faker-seed=1234

# Output: ./output/file-data-generator/EaziPay/2025-01-24-14-30-45-EaziPay-100.csv
```

### HTTP API

```bash
# Send request to http://localhost:3002/generate
curl -X POST http://localhost:3002/generate \
  -H "Content-Type: application/json" \
  -d '{
    "fileType": "SDDirect",
    "numberOfRows": 50,
    "seed": 1234
  }'

# Returns file path in response:
# {"filePath": "./output/file-data-generator/SDDirect/2025-01-24-14-30-45-SDDirect-50.csv"}
```

## Deterministic Output

All generators support the `FAKER_SEED` environment variable for deterministic, reproducible output:

```bash
FAKER_SEED=1234 npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=100
# Same seed = same output (useful for testing)
```

## Test Output

Test-generated files follow the same structure. They are placed under `OUTPUT_ROOT/file-data-generator/` but organized in dedicated test subdirectories when using the test utilities.

## Cleanup

Output files are **never** automatically cleaned up from the generator. To remove old files:

```bash
# Manual cleanup (be careful!)
rm -rf ./output/file-data-generator/*
```

Test fixtures are managed separately via the test-orchestrator's automatic cleanup hooks.
