Task

- Produce N CSV transactions and save to the provided Windows path. If N or path not provided, ask before starting.

Preconditions

- Output: CSV file (no header), UTF‑8, rows only. Each row must contain exactly the fields in this order (all strings unless specified):
  1. Transaction Code
  2. Originating Sort Code
  3. Originating Account Number
  4. Destination Sort Code
  5. Destination Account Number
  6. Destination Account Name
  7. Fixed zero
  8. Amount (in pence, see rules)
  9. Processing Date
  10. Empty (leave empty)
  11. SUN Name
  12. BACS Reference
  13. SUN Number (optional — may be empty)
  14. Empty Trailer 1 (empty string)
  15. Empty Trailer 2 (empty string)

Fixed origin details (use exactly)

- Originating Sort Code = 912291
- Originating Account Number = 51491194
- SUN Name = SUN-C-0QZ5A
- SUN Number = 797154 (include only when rules below allow; otherwise leave empty)

Allowed characters (any field)

- Letters A–Z a–z, digits 0–9, period (.), ampersand (&), slash (/), hyphen (-), space ( )
- No commas, no other punctuation

Field rules (mandatory)

- Transaction Code: one of {01, 17, 18, 99, 0C, 0N, 0S}. Not null.
- Destination Sort Code: numeric, exactly 6 digits.
- Destination Account Number: numeric, exactly 8 digits.
- Destination Account Name: realistic account name, ≤18 characters, allowed characters only.
- Originating Account Name (if used): ≤18 chars, allowed chars only.
- Fixed zero: must be "0".
- Amount: integer (no thousands separators). If Transaction Code ∈ {0C, 0N, 0S} amount must be "0".
- BACS Reference: length >6 and <18, allowed characters only, must start with a word character (letter/number), must not start with "DDIC" or a space, must not consist of the same character repeated.
- SUN Number: optional. If Transaction Code ∉ {0C,0N,0S} it must be empty. It may be empty even when Transaction Code ∈ {0C,0N,0S}.
- Empty / Empty Trailer columns: render as empty fields (i.e., two consecutive commas represent an empty field).
- Only the exact allowed characters above may appear in any field.

Processing Date rules

- Must use format DD-MMM-YYYY (e.g., 07-Apr-2025) as in FileFormats.
- Must be at least 2 working days in the future and must not fall on Saturday, Sunday, or UK Bank Holiday.
- If Transaction Code ∈ {0N,0C,0S}, Processing Date MUST be exactly 2 working days in the future.
- Determine UK working days using the official UK bank holiday calendar for the processing year.

Generation requirements

- Validate every generated row against all rules. If any row fails, do not include that row in the output.
- write CSV to the specified Windows path (overwrite if file exists) and return success + file path + UTC start/end timestamps. Include only valid rows in the file.
- No header row. All rows must have 15 comma-separated fields; empty fields represented as empty between commas.

Behaviour for missing inputs

- If number of transactions or save path is not provided: ask the user for them and pause.

Output example (template)

- Example template row (replace placeholders):
  99,912291,51491194,230580,37278734,Phillip Mann,0,7228,07-Apr-2025,,SUN-C-0QZ5A,RefundEGM500133078,,,

Validation summary (on completion)

- Return PASS/FAIL, total rows, any validation errors (row#, field, message), file path if written, UTC start/end times.

Stop and ask if unclear about:

- Number of transactions
- Save path
