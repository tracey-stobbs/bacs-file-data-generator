# EaziPay File Format Documentation

## Overview
The EaziPay file format is designed for generating payment files that comply with the EaziPay specifications. This document outlines the structure, requirements, and validation rules for the EaziPay file format.

## File Structure
The EaziPay file consists of the following sections:

1. **Header**
   - Contains metadata about the file, including the file type, creation date, and other relevant information.

2. **Transaction Records**
   - Each transaction record includes details such as:
     - Transaction ID
     - Amount
     - Currency
     - Date
     - Payee information

3. **Footer**
   - Summarizes the total number of transactions and the total amount processed.

## Requirements
- The file must be encoded in UTF-8.
- Each record must be separated by a newline character.
- The header must be present and correctly formatted.
- All mandatory fields in transaction records must be filled.

## Validation Rules
- Ensure that the transaction amount is a valid decimal number.
- Validate that the currency code is a recognized ISO 4217 code.
- Check that dates are in the correct format (YYYY-MM-DD).
- The transaction ID must be unique within the file.

## Example
```
HEADER|EaziPay|2023-10-01
TRANSACTION|12345|100.00|GBP|2023-10-01|John Doe
TRANSACTION|12346|200.00|GBP|2023-10-01|Jane Smith
FOOTER|2|300.00
```

## Conclusion
This document serves as a guide for developers working with the EaziPay file format. Adhering to the outlined structure and validation rules will ensure successful file generation and processing.