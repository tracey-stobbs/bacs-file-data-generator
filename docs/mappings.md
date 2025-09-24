# Field mappings: canonical -> format-specific

This document describes the canonical input shape used by the generator, and how each canonical field maps to format-specific output (EaziPay, BACS). It includes field lengths, allowed characters, and transformation rules. Where exact field sizes are format-specific, a recommended value is provided and flagged as an assumption when derived from available docs. If the authoritative length differs, update the table below and the sanitizer/mapper code.

## Canonical record (summary)

Canonical records are the internal representation that input parsers (CSV/XML/JSON) map to. Minimal shape:

- id?: string | number
- originating: {
  - sortCode: string  // 6 digits
  - accountNumber: string // 8 digits (preferred)
  - accountName: string
  - sunNumber?: string
  - sunName?: string
}
- beneficiary: {
  - sortCode?: string
  - accountNumber?: string
  - accountName?: string
  - reference?: string
}
- amount: number // integer pence
- currency?: string // default 'GBP'
- processingDate?: string // ISO date or YYYY-MM-DD
- transactionType?: string
- metadata?: Record<string, any>

## General transformation rules

- Remove all non-digit characters from sort codes and account numbers before validation.
- Left-pad account numbers with zeros to 8 digits only when config.allowPadding === true; otherwise fail validation.
- Sanitize names by removing or replacing disallowed characters, normalizing whitespace and trimming.
- Truncate fields that exceed format maximum lengths and emit a WARNING with original+truncated values.
- Amounts must be integers in pence (no decimals). Reject fractional values in strict mode.

## EaziPay mapping (recommended)

Notes: these lengths and allowed characters were inferred from `docs/FileFormats/EaziPay.md` and sample outputs in `output/EaziPay/`. Treat these as authoritative defaults; update if the EaziPay spec in `docs/` or an XSD dictates different sizes.

- Header fields
  - formatVersion: string (example: "14_8")
  - originatorSUN: string (SUN typically numeric, length up to 10)
  - generationDateTime: YYYYMMDDHHMMSS

- Detail record mapping (per payment)
  - PayerSortCode <= canonical.originating.sortCode
    - Type: digits
    - Max length: 6
    - Required: yes
    - Transform: remove non-digits
  - PayerAccountNumber <= canonical.originating.accountNumber
    - Type: digits
    - Max length: 8
    - Required: yes
    - Transform: remove non-digits, left-pad zeros if allowed
  - PayerAccountName <= canonical.originating.accountName
    - Type: printable characters
    - Max length: 18 (assumption — update if spec differs)
    - Allowed chars: A-Z a-z 0-9 space - & ' , . / and parentheses; others are replaced or removed
    - Transform: sanitize, collapse multiple spaces, truncate to max length
  - PayeeSortCode <= canonical.beneficiary.sortCode
    - Same rules as PayerSortCode
  - PayeeAccountNumber <= canonical.beneficiary.accountNumber
    - Same rules as PayerAccountNumber
  - PayeeAccountName <= canonical.beneficiary.accountName
    - Max length: 18 (assumption)
  - Amount <= canonical.amount
    - Format: integer pence. Some EaziPay flavors expect decimal with two d.p.; mapping functions should expose both behaviours via config (amountFormat: 'pence' | 'decimal')
  - PaymentReference <= canonical.beneficiary.reference or canonical.metadata.reference
    - Max length: 18 (assumption) — confirm against EaziPay.md
    - Allowed chars: limited printable ASCII; sanitize & truncate
  - ProcessingDate <= canonical.processingDate
    - Format: YYYYMMDD (or per EaziPay header requirement)

- Trailer
  - TotalAmount: sum of amounts
  - RecordCount: number of detail records

## BACS mapping (high level)

- BACS files use fixed-width records (A/B/C/D types). The canonical fields map to appropriate BACS record fields.
- Field padding: where BACS requires fixed widths, numeric fields are left-zero-padded, text fields are right-space-padded.
- Use `xsd-types/` and `_docs/Bacss/` PDFs for exact widths. If XSDs are present for BACS XML variants, use those as source-of-truth.

Examples (conceptual):
- BACS:C-record -> beneficiary.accountName (trim/truncate to 18 or format-specific length)
- BACS:D-record -> amount (pence) mapped into the numeric field for transaction value

## CSV output mapping

- CSV column names are a 1:1 mapping to canonical keys using dotted column names for nested fields (e.g., `originating.sortCode`, `beneficiary.accountNumber`).
- Output CSV must be UTF-8 encoded. If a downstream format requires ASCII-only, use `--encoding=ascii` to transliterate.

## Where to update these mappings

- `src/lib/factory.ts` (or `lib/fileType/*`) should implement these mappings. Keep the mapping table here in sync with the code by updating this file when formats change.

## Assumptions & TODOs

- Account name max lengths (18) and reference lengths (18) are assumptions taken from sample outputs. Confirm exact limits from `docs/FileFormats/EaziPay.md` and update mapping & sanitizer accordingly.
- If an authoritative XSD exists for a given output format, that XSD wins — codify its lengths and types into `xsd-types/` and regenerate mapping docs.

---

Last updated: 2025-09-24
