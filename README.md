# bacs-file-data-generator — CLI

This package provides a small CLI to generate BACS-style test files (EaziPay currently supported). The CLI is intentionally lightweight and calls the same library API used by other parts of the workspace.

Prerequisites
- Node.js (16+ recommended)
- npm
- `ts-node` is used to run the TypeScript CLI directly (we call it via `npx` in examples)

Quick start (PowerShell)

1. From the package root, run the CLI with `npx`:

```powershell
# Basic: generate 10 rows of an EaziPay file
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10
```

2. Or use the convenience npm script added to package.json:

```powershell
# Uses the package script which runs the same CLI via ts-node
npm run generate-file -- --fileType=EaziPay --rows=10
```

Examples (copy-pasteable)

# 1. Deterministic output with Faker seed
```powershell
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --faker-seed=1234
```

# 2. Include invalid rows (useful for negative testing)
```powershell
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=25 --invalid
```

# 3. Write output to a specific folder
```powershell
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --outputRoot=./tmp-output
```

# 4. Override originating account details
```powershell
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --originating.sortCode=401726 --originating.accountNumber=51779109 --originating.accountName="Azura Group Ltd"
```

# 5. Full example (deterministic, invalid rows, custom output, overrides)
```powershell
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=50 --invalid --faker-seed=42 --outputRoot=./tmp-output --originating.sortCode=401726 --originating.accountNumber=51779109 --originating.accountName="Azura Group Ltd"
```

Advanced notes
- The CLI sets `process.env.FAKER_SEED` when you pass `--faker-seed` so generated data can be reproduced.
- Currently the package `types.ts` defines `SupportedFileType = 'EaziPay'`. If more file types are implemented in this package, the CLI accepts them via `--fileType`.
- The CLI prints a JSON result with `filePath` and `fileContent`, and then prints a short preview (first ~30 lines) when the generated file is available on disk.

Troubleshooting
- If you get `ts-node` not found, install it locally: `npm i -D ts-node typescript @types/node` or run via `npx` as shown above.
- For permission errors when writing files, check `--outputRoot` and file-system permissions.

Next steps you might want
- Add a `bin` entry and compile the CLI into `dist` for an installed global CLI experience.
- Add examples for other file types as they are implemented in `types.ts`.

Questions or changes
If you want, I can:
- run the CLI now with a set of args and show the produced file content,
- add a short `README` section that documents common originating SUN values used across the workspace, or
- add a `--preview` flag to print only preview rows instead of writing a file.

---
Generated CLI location: `src/cli/generate.ts`
# BACS File Data Generator

Lightweight TypeScript library for generating preview data and full test files for Direct Debit CMS related payment file types:

* EaziPay (complete)
* Bacs18PaymentLines (core structure migrated; validation parity audit pending)
* SDDirect (row building in place; file generation TBD)

## Features
* Strongly typed generation & preview API (see `types.ts`).
* Deterministic metadata (row/column counts, validity flag, file type).
* Optional invalid row injection for negative testing.
* Pluggable file writers with safe output path handling.

## Quick Start
```ts
import { generateFile, previewRows } from 'bacs-file-data-generator';

const preview = await previewRows({ fileType: 'EaziPay', numberOfRows: 10, hasInvalidRows: true, sun: 'DEFAULT' });
console.log(preview.metadata.validity); // 'I'

const file = await generateFile({ fileType: 'EaziPay', numberOfRows: 10, hasInvalidRows: true, sun: 'DEFAULT' });
console.log(file.filePath);
```

## Roadmap
| Area | Status | Notes |
|------|--------|-------|
| EaziPay | ✅ | Generation + preview + tests |
| Bacs18PaymentLines | ⚠️ | Needs validation parity + tests |
| SDDirect | 🚧 | File generation not yet implemented |

## Migration (from monolith)
See `docs/migration.md` for detailed steps.

## Contributing
1. Run lint & tests: `npm test && npm run lint`
2. Add/adjust tests for new behaviors.
3. Keep public surface stable (`src/index.ts`).

## License
Proprietary / Internal (update if publishing publicly).# bacs-file-data-generator

## Overview
The `bacs-file-data-generator` is a Node.js package designed for generating various file formats used in the DDCMS Direct system. This package provides functionalities to create, validate, and write files such as SDDirect and EaziPay, ensuring compliance with the required specifications.

## Features
- **File Generation**: Create SDDirect and EaziPay files with ease.
- **Validation**: Validate generated files against predefined rules and formats.
- **Extensible Architecture**: Easily add new file types and validation rules.

## Installation
To install the package, clone the repository and run the following command in the project root:

```bash
npm install
```

## Usage
To use the generator in your project, import the necessary classes and functions from the package:

```typescript
import { Factory } from 'bacs-file-data-generator/lib/factory';
import { SDDirect } from 'bacs-file-data-generator/lib/fileType/sddirect';
import { EaziPay } from 'bacs-file-data-generator/lib/fileType/eazipay';
```

## Running Tests
To run the unit tests for the generator, execute:

```bash
npm test
```

## Directory Structure
- **src/**: Contains the source code for the generator.
- **tests/**: Contains unit tests for the generator functionalities.
- **docs/**: Documentation for file formats and usage.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.