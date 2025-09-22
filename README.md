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