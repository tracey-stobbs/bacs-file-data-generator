# EaziPay CSV Schema

This document describes the EaziPay CSV row structure produced by `generateCsv({ reportType: 'eazipay' })` and related helpers.

## Field Order
| # | Field Name | Description | Notes |
|---|------------|-------------|-------|
| 1 | transactionCode | BACS/EaziPay transaction code | One of 01,17,18,99,0C,0N,0S. Constrained per report type (e.g. ARUCS => 99 only). |
| 2 | originatingSortCode | Originating bank sort code | 6 digits. |
| 3 | originatingAccountNumber | Originating account number | 8 digits. |
| 4 | destinationSortCode | Destination sort code | 6 digits. |
| 5 | destinationAccountNumber | Destination account number | 8 digits. |
| 6 | destinationAccountName | Beneficiary name | Truncated to <=18 chars. May contain spaces, quoted if commas. |
| 7 | fixedZero | Literal `0` | Reserved, always 0. |
| 8 | amount | Integer amount in pence (example) | 1..999999 unless maintenance/contra (0C/0N/0S => 0). |
| 9 | processingDate | Future working date | Format: YYYY-MM-DD (seeded if FAKER_SEED). |
| 10 | empty | Always empty | Placeholder for historical alignment. |
| 11 | sunName | SUN / Service User Name | Truncated; may be quoted if commas. |
| 12 | bacsReference | Payment reference | 7..17 chars; excludes patterns starting with space/DDIC and not all identical chars. |
| 13 | sunNumber | Optional SUN number | Only for eligible transaction codes; else empty. |
| 14 | emptyTrailer1 | Empty filler | Reserved future use. |

## Determinism & Seeding
Set `FAKER_SEED` to a numeric value to make row generation deterministic.

## Transaction Code Constraints
| Report Type | Allowed Codes |
|-------------|---------------|
| input | 01,17,18,99,0C,0N,0S |
| arudd | 01,17,18 |
| arucs | 99 |

## CSV Formatting Rules
- Fields containing commas, quotes, or newlines are wrapped in double quotes.
- Embedded quotes are escaped by doubling them (e.g., `He said "Hello"` => `"He said ""Hello"""`).
- Empty fields emit as bare empty tokens (`,,`).

## Library APIs
- `generateEaziPayRowsConstrained({ ... })` returns string[][] rows.
- `generateCsv({ reportType: 'eazipay', ... })` returns `{ rows, csv }` with quoting applied.
- `csvQuote(fields: string[])` / `csvParse(line: string)` for low-level operations.

## Validation Considerations
- Length and character rules are enforced probabilistically (faker generation + constraints) but not strictly validated at serialization time.
- For strict validation, extend validators or add a preflight step using existing `EaziPayValidator`.

## Future Extensions
- Add support for SD Direct and BACS18 using the same `generateCsv` facade.
- Add schema versioning field for downstream consumers.
