# bacs-file-data-generator HTTP Wrapper (Milestone 2)

Adds an optional lightweight Fastify HTTP server exposing the library generation capability.

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

```bash
npm run dev-server # listens on port 3002 (override PORT env var if needed)
```

## Future Expansion

Planned fileTypes: BACS18, PaymentLines, SDDirect. Until implemented, they return 501. Façade service will orchestrate multiple calls in later milestones.

## Testing

Vitest tests include deterministic seed assertions in `tests/http-generate-file.spec.ts`.
