# Validation rules and error codes

This document lists the validation pipeline, field-level validation rules, allowed transformations, and standardized error/warning codes used by the generator. The goal is to make validation behaviour predictable and testable.

## Validation pipeline

1. Input parsing (CSV/XML/JSON) -> canonical records.
2. Structural/schema validation (required fields present).
3. Sanitization (strip non-digits, normalize whitespace, transliterate where configured).
4. Field-level validation (regex, ranges, strictness checks).
5. Business rules validation (processing dates, duplicate detection, SUN checks).
6. Mapping and output formatting.
7. Optional XSD validation of generated output.

At any point, errors classified as `ERROR` abort the run in strict mode and contribute to non-zero exit codes. `WARNING`s are recorded in the run summary but do not abort unless `--strict` is enabled.

## Validation levels

- ERROR (critical): record is invalid and should cause failure in strict mode. Examples: invalid sort code after sanitization, negative/zero amount, missing required account number.
- WARNING (soft): record may be generated after transformation. Examples: truncated name, padded account number (if allowPadding=true), missing optional fields.
- INFO: General processing info (counts, summary).

## Field-level rules (table)

- originating.sortCode
  - Type: string
  - Sanitization: remove non-digits
  - Pattern: ^\d{6}$
  - On failure: ERROR
  - Code: ERR_INVALID_SORTCODE

- originating.accountNumber
  - Type: string
  - Sanitization: remove non-digits
  - Pattern: ^\d{8}$ (default) — some formats accept 6-8 digits; configurable
  - On short length and config.allowPadding=true: left-pad with zeros -> WARNING (CODE: WARN_PADDED_ACCOUNT_NUMBER). If not allowed -> ERROR (ERR_INVALID_ACCOUNT_NUMBER_LENGTH)
  - Code: ERR_INVALID_ACCOUNT_NUMBER

- originating.accountName
  - Type: string
  - Sanitization: remove control chars, collapse spaces, remove/replace disallowed punctuation
  - Max length: format-specific (EaziPay default: 18)
  - On truncation: WARNING (WARN_TRUNCATED_FIELD)
  - Code: ERR_INVALID_ACCOUNT_NAME (used if after sanitization the name is empty and the format requires it)

- beneficiary.accountNumber / beneficiary.sortCode
  - Same rules as originating counterpart

- amount
  - Type: integer
  - Units: pence (minor units)
  - Allowed range: >= 1 and <= config.maxAmount (default 100,000,000 pence = £1,000,000)
  - Fractional values: ERROR (ERR_INVALID_AMOUNT_FORMAT)
  - Negative or zero: ERROR (ERR_INVALID_AMOUNT_RANGE)

- processingDate
  - Type: date string
  - Accepts: YYYY-MM-DD or ISO-8601
  - Valid business day check: optional, controlled by `config.businessDayChecks`.
  - On invalid date: ERROR (ERR_INVALID_DATE) or default to `options.processingDate` if provided.

- sunNumber / sunName
  - Rules: format-specific. If required by format and missing => ERROR (ERR_MISSING_SUN)

- reference / transactionType
  - Max length: format-specific (example: 18)
  - Allowed chars: printable ASCII subset; sanitize/replace unsupported

## Error and warning codes (summary)

- ERR_INVALID_SORTCODE — sort code is not 6 digits after sanitization
- ERR_INVALID_ACCOUNT_NUMBER — account number contains non-digit characters or invalid length
- ERR_INVALID_ACCOUNT_NUMBER_LENGTH — account number length outside accepted range and padding disallowed
- WARN_PADDED_ACCOUNT_NUMBER — account number was left-zero-padded to meet length
- ERR_INVALID_AMOUNT_FORMAT — amount not an integer
- ERR_INVALID_AMOUNT_RANGE — amount <= 0 or > config.maxAmount
- ERR_INVALID_DATE — processing date malformed
- ERR_MISSING_REQUIRED_FIELD — a required field is missing
- WARN_TRUNCATED_FIELD — a text field was truncated to meet format length
- ERR_XSD_VALIDATION_FAILED — generated output failed XSD validation
- ERR_IO_WRITE_FAILED — failed to write output file

## Examples of validation messages

- { code: 'ERR_INVALID_SORTCODE', level: 'ERROR', message: "originating.sortCode '91-2291' invalid after sanitization", recordId: 'row-13' }
- { code: 'WARN_TRUNCATED_FIELD', level: 'WARNING', message: "originating.accountName truncated from 32 to 18 chars", original: 'Very Long Name Ltd - Some Division', truncated: 'Very Long Name Ltd' }

## Configuration knobs that influence validation

- `strict` (boolean): when true, treat warnings as errors.
- `allowPadding` (boolean): if true, left-pad account numbers shorter than 8 digits to 8.
- `validateXsd` (boolean): when true, validate generated outputs against available XSDs.
- `businessDayChecks` (boolean): when true, enforce processingDate is a business day (skip weekends and configured holidays).
- `maxAmount` (number): maximum allowed amount in pence.

## Run summary output

Each generation run MUST produce a JSON summary at the end of the run (written next to outputs or to stdout if `--dryRun`) with the following shape:

{
  "timestamp": "2025-09-24T...Z",
  "reportType": "EaziPay",
  "inputFile": ".../INPUT.csv",
  "processed": 15,
  "generated": 15,
  "errors": [ { recordId, code, message } ],
  "warnings": [ { recordId, code, message } ],
  "files": [ { path, checksum, size } ]
}

## Tests to implement

- Unit tests for each error/warning code path (examples exist in `tests/unit/validators.spec.ts`).
- Integration test generating one file with an intentionally malformed record to confirm proper error/warning handling and exit codes.

---

Last updated: 2025-09-24
