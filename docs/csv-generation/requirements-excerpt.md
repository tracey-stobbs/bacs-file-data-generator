(Requirements excerpt — CSV generation & mapping rules)

This file contains an actionable excerpt of project requirements relevant to CSV generation and mapping. It is derived from the workspace `@docs/requirements.md` and highlights the canonical input shape, validation levels, mapping guidance, and testing/CI expectations for the generator package.

Key points:

- Inputs: CSV rows map to a canonical TypeScript shape; required fields include originating sort code/account number, beneficiary sort/account, amount (pence), processingDate, and reference.
- Validation: strict on amounts and account numbers; sanitise names and references; truncate to output format lengths.
- Mapping: implement explicit mapping functions per file type in `src/lib/fileType/*`.
- Tests: unit tests for mapping & validation; integration smoke tests to generate small files.
