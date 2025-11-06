**Bacs Standard 18 Payment File – Generation Requirements**

All positions below are 1-based inclusive. Length = EndPosition - StartPosition + 1. Unless stated otherwise, padding is with space (blank) for alphanumeric and zero for strictly numeric where implemented in current builder code. Julian dates use format: bTTDDD (1 blank + 2 digit month (TT) + 3 digit day-of-year (DDD)).

---

1. Line Types (in a full Standard file)

---

Order:

1. VOL1 (File label header)
2. HDR1 (Primary file header)
3. HDR2 (Secondary format header)
4. UHL1 (User header)
5. Transaction Records (payment and DDI lines)
6. Contra Records (if required – balancing lines)
7. EOF1 (Trailer – mirror of HDR1)
8. EOF2 (Trailer – mirror of HDR2)
9. UTL1 (Totals trailer)

In a “PaymentLinesOnly” or “DDILinesOnly” file: only transaction lines (no headers/trailers/contras auto-generated).

Daily vs Multi:

- Daily transaction line length: 100 (no Processing Date field)
- Multi-processing transaction line length: 106 (includes Processing Date at positions 101–106)

---

2. VOL1 Header (Length: 80)
   Pattern built as: VOL1{SerialNumber}{Reserved1}{SunNumber}{Reserved2}{StandardLevel}
   Concrete format string in code: "VOL1{SerialNumber} {SUN} 1"
   Fields:
   1-4 Label "VOL1"
   5-10 Serial Number 6 chars (service user provided; padded right in test generator)
   11-41 Reserved 31 blanks
   42-47 SUN Number 6 numeric (BacsStandard18Vol1HeaderFormat.SunNumber)
   48-79 Reserved 32 blanks
   80 Standard Level "1"

Validation notes: SUN must be numeric; label must be VOL1; other reserved fields blank-filled.

---

3. HDR1 Header (Length: 80) (Mirrored by EOF1)
   Format string: "HDR1A{SUN}S {SUN}{Serial}00010001 {CreationDate} {ExpirationDate} 000000 "
   Fields (inferred from validators and string pattern):
   1-4 Label "HDR1"
   5 File Identifier Start "A"
   6-11 SUN Number (1) First SUN occurrence
   12 File Identifier Mid "S"
   13-15 Reserved 3 blanks
   16-21 SUN Number (2) Second SUN occurrence (must match first)
   22-27 Serial Number 6 chars
   28-31 File Section Number "0001"
   32-35 File Sequence Number "0001"
   36-42 Reserved 7 blanks
   43-47 Creation Date (Julian) bTTDDD
   48 Reserved 1 blank
   49-53 Expiration Date (Julian) bTTDDD (next working day after last processing date used for multi-date files)
   54 Accessibility Indicator " " (blank – S in earlier specification area already consumed)
   55-60 Block Count "000000" (replaced to non-zero in EOF1 when trailer reflects total blocks)
   61-80 Reserved 20 blanks

(EOF1 is identical to HDR1 with label replaced HDR1 → EOF1 and block count recomputed.)

---

4. HDR2 Header (Length: 80) (Mirrored by EOF2)
   Format string: "HDR2F0012000106 00 "
   Fields (deduced):
   1-4 Label "HDR2"
   5 Record Format "F"
   6-9 Block Length "0012"
   10-15 Record Length "000106"
   16-51 Mid/Buffer Field 36 blanks (treated as buffer / implementation reserved)
   52-53 Buffer Offset "00"
   54-79 Reserved 26 blanks
   80 Reserved blank (last char; overall reserved region from 52–79 per validator, plus trailing blank)

(EOF2 is HDR2 mirrored: HDR2 → EOF2 label swap.)

---

5. UHL1 Header (Length: 80)
   Defined explicitly (Uhl1BacsStandard18Format):
   1-3 Label Identifier "UHL"
   4 Label Number "1"
   5-10 Processing Date (Julian) bTTDDD (must be current day if DDIs included; must not be in past)
   11-16 Identifying Receiving Party (1) "999999"
   17-20 Identifying Receiving Party (2) blanks
   21-22 Currency Code "00" (sterling)
   23-28 Country Code "000000"
   29-37 Work Code One of:
   "1 DAILY " (Daily file)
   "4 MULTI " (Multi-date file)
   "5 RECALLS" (standing order recalls; requires bank-grade)
   38-40 File Number 3 numeric (000–999; code pads modulo 1000)
   41-47 Reserved blanks
   48-54 Audit Print Identifier Either "AUDnnnn" or blanks (nnnn = frequency)
   55-80 Reserved blanks

---

6. Transaction Record – Payment / DDI (Length: 106 Multi, 100 Daily)
   BacsStandard18TransactionLineFormat:
   Pos Field Length Description
   1-6 Destination Sort Code 6 Numeric; validated
   7-14 Destination Account Number 8 Numeric; may be all zeros (then name required)
   15 Destination Account Type 1 Must be "0"
   16-17 Transaction Code 2 Must be one of allowed codes (debit/credit/DDI set)
   18-23 Originating Sort Code 6 Optional in upload (can be blank); validated if present
   24-31 Originating Account Number 8 Optional in upload (can be blank); validated if present
   32-35 Free Format 4 Not validated (filled with spaces unless checksum for SdDirect)
   36-46 Amount (in pence) 11 Zero-filled numeric; blank allowed only for DDI (treated as 0)
   47-64 Narrative 18 Free text; validated characters; space padded
   65-82 Reference 18 Service user reference; ≥6 significant chars unless Credit; must pass regex; reserved word "CONTRA" denotes contra line; uniqueness / no reserved prefix "DDIC"; not all identical chars
   83-100 Destination Account Name 18 Required if Account Number all zeros; validated name characters
   101-106 Processing Date (Julian) 6 Present only for MULTI file lines; omitted for DAILY (line length 100)

Validation nuances:

- Line type classification uses length and presence of Julian date.
- Amount: stored in pounds internally; file value is pence zero-padded.
- Contra identification for normal payment lines is absent; “CONTRA” only on separate contra records.

---

7. Contra Record (Length: 106)
   BacsStandard18ContraLineFormat:
   Pos Field Length Description
   1-6 Destination Sort Code 6 Must match originating SUN bank account
   7-14 Destination Account Number 8 Must match originating SUN bank account
   15 Destination Account Type 1 "0"
   16-17 Transaction Code 2 Must be 17 or 99 (balancing rule): - Code 99 (Credit) used to contra debits - Code 17 (Subsequent Payment) used to contra credits
   18-23 Originating Sort Code 6 Same as positions 1-6
   24-31 Originating Account Number 8 Same as positions 7-14
   32-35 Free Format 4 Spaces
   36-46 Amount (in pence) 11 Total of balanced lines for same date; > 0
   47-64 Narrative 18 Optional (space padded); often blank or "CONTRA"
   65-82 Contra Identification Label 18 "CONTRA" (space padded)
   83-100 Originating Account Name 18 Abbreviated/padded; <= 18 chars
   101-106 Processing Date (Julian) 6 Same processing date as lines being balanced

Generation rules:

- For each processing date, if total debits > 0 create credit contra; if total credits > 0 create debit contra.
- Updates Debit/Credit totals and counts in file aggregation.

---

8. EOF1 Trailer (Length: 80)
   Mirror of HDR1 with label replaced "HDR1" → "EOF1".
   Same field layout as HDR1; Block Count usually updated to reflect actual block count (validator distinguishes creation vs trailer context).

---

9. EOF2 Trailer (Length: 80)
   Mirror of HDR2 with label replaced "HDR2" → "EOF2".
   Same field layout.

---

10. UTL1 Trailer (Length: 80)
    Utl1BacsStandard18Format:
    Pos Field Length Description
    1-3 Label Identifier 3 "UTL"
    4 Label Number 1 "1"
    5-17 Debit Monetary Total 13 Total debit value in pence (zero-padded)
    18-30 Credit Monetary Total 13 Total credit value in pence (zero-padded)
    31-37 Debit Item Count 7 Number of debit transactions (zero-padded)
    38-44 Credit Item Count 7 Number of credit transactions (zero-padded)
    45-52 Reserved 8 Blanks
    53-59 DDI Count 7 Count of DDI instruction items (zero-padded or blanks → treated as 0)
    60-80 For Use By Service User 21 Blanks (not validated)

Validation:

- DebitValueTotal == CreditValueTotal unless both zero and DDI count > 0.
- Error raised if mismatch (see Utl1Trailer.CreditAndDebitValuesEqual logic).

---

11. Transaction Codes (from repository logic)
    Debit codes: 01, 17, 18, 19 (and any defined in FileForgetOutgoingFileTransactionCodes.Debits()).
    Credit code: 99.
    DDI codes: subset returned by FileForgetOutgoingFileTransactionCodes.Ddis().
    Contra uses: 17 or 99 (opposite of balanced set).

---

12. Processing Date Rules

- UHL1 Processing Date: future working day (not weekend); for DDIs must be current day.
- HDR1 Creation Date: Julian date of file creation / processing base date.
- HDR1 Expiration Date: Next working day after latest processing date (for multi-date).
- Contra and Transaction lines (MULTI): each line may carry its own Julian processing date (positions 101-106).
- Daily files: no line-level processing date; file-level UHL1 date applies; validation removes per-line date requirement.

---

13. Amount Field Rules

- Stored as decimal pounds internally; serialized as integer pence zero-padded to 11 chars.
- DDI lines: amount blank or zeros → treated as 0; any positive amount on DDI is invalid.

---

14. Reference Field Rules (Transaction Lines)

- Must be ≥ 6 chars (trimmed) except credits (can be shorter / blank if passes permissive regex branch).
- First character must be alphanumeric.
- Cannot start with "DDIC".
- Cannot consist of a single repeated character.
- Must match allowed characters regex.
- "CONTRA" (case-insensitive) sets IsContra flag for contra identification logic.

---

15. Destination Account Name Rules

- Required (non-blank) if account number all zeros (or blank) to distinguish; validated character set.

---

16. File Totals (UTL1)

- Debit/Credit Value Totals: sum of transaction/debit or credit lines (including contra adjustments).
- Debit/Credit Item Counts: number of corresponding transaction lines (contra lines increment opposite side in builder).
- DDI Count: number of DDI instruction lines.

---

17. Error Handling / Validation Actions (Summary)

- Structural mismatches (line length vs expected file type) raise errors.
- Invalid Julian date format on multi lines → error; on daily lines may be treated as overflow and ignored.
- Missing contra lines when both debits or credits exist → error.
- UTL1 mismatch of totals → error.
- Invalid bank details after modulus check → line-level validation failure.
- SUN permissions: rejects if disallowed debit/credit type appears.
- Processing date too far into future (> configured max) → file cancelled.
- Missing processing date (daily) or SUN results in specific file statuses.

---

18. Line Length Recap
    VOL1 80
    HDR1 80
    HDR2 80
    UHL1 80
    Transaction (Daily) 100
    Transaction (Multi) 106
    Contra 106
    EOF1 80
    EOF2 80
    UTL1 80

---

19. Padding / Formatting Conventions

- Numeric counts / amounts: left zero-padded.
- Alphanumeric fields: right space-padded.
- References / names truncated to maximum length if longer.
- Julian dates: left blank + 5 chars (total 6 positions in field).
- FreeFormat always spaces unless overridden for SD Direct checksum scenario (occupies positions 32-35).

---

20. Generation Logic Summary
1. Build headers (VOL1, HDR1, HDR2, UHL1) using file metadata (SerialNumber, SUN, ProcessingDate).
1. Append transaction lines (each formatted per field spec; multi-date adds Julian date; daily omits it).
1. If full Standard file:
   - Generate contra lines per processing date balancing debit vs credit totals (two potential lines per date).
1. Append trailers: EOF1, EOF2 (mirrors), UTL1 (computed totals).
1. Encode as UTF-8 text, newline separated.

---

21. Assumptions & Inferences

- HDR1/HDR2 field boundaries derived from existing validators plus current format strings (spec references not fully implemented in code).
- Reserved regions must remain blank to pass validators.
- Block Count updated in EOF1 context (creation HDR1 uses placeholder zeros).
- Some HDR1 mid fields (e.g., accessibility indicator) treated as static blanks in current builder.
