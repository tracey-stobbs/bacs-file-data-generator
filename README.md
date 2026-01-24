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
