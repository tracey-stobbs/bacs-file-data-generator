# Copilot Project Instructions (bacs-file-data-generator)

Concise, action-focused guidance for AI coding agents working on this repository.

## 1. Purpose & Architecture

This is a **TypeScript ESM library + CLI** for generating BACS-style test data files (primarily EaziPay). Core architecture:

- **Factory Pattern**: `src/lib/factory.ts` routes by file type to specific generators
- **Generator Strategy**: Each file type lives in `src/lib/fileType/{name}/generator.ts`
- **Adapter Interface**: `AdapterInterface<TReq>` in `types.ts` defines contract for new file types
- **Deterministic Output**: Uses `FAKER_SEED` env var for reproducible test data generation

Key data flow: CLI → Factory → Generator → FileWriter → Output folder

## 2. Key Directories & Files

- `src/cli/generate.ts`: CLI entry point with arg parsing and file preview
- `src/lib/factory.ts`: Dynamic import dispatcher for file type generators
- `src/lib/fileType/eazipay/generator.ts`: Main EaziPay generation logic (~539 lines)
- `src/lib/fileType/eazipay/types.ts`: EaziPay domain types and transaction codes
- `src/lib/validators/eazipayValidator.ts`: Business rules and validation constants
- `src/types.ts`: Core public API types (`GenerationRequest`, `PreviewResult`, etc.)
- `src/index.ts`: Public barrel exports for library consumers

## 3. Critical Development Patterns

### Deterministic Generation

**Always** preserve determinism for tests:

```typescript
// Set seed before generation
if (process.env.FAKER_SEED) faker.seed(Number(process.env.FAKER_SEED));
```

Use `--faker-seed=1234` in CLI or set `FAKER_SEED` env var. Tests rely on golden outputs.

### File Type Extension (Adding New Types)

1. Add type to `SupportedFileType` union in `src/types.ts`
2. Create `src/lib/fileType/{name}/` folder with `generator.ts`, `types.ts`, `index.ts`
3. Implement `AdapterInterface<TReq>` with `buildPreviewRows()`, `serialize()`, `previewMeta()`
4. Add case to factory dispatcher in `src/lib/factory.ts`
5. Export from main `src/index.ts`

### Validation Strategy

- Domain rules in `src/lib/validators/{name}Validator.ts` (constants, type guards)
- Row-level validation during generation (reject invalid transaction codes, etc.)
- Invalid row injection via `hasInvalidRows` flag for negative testing

## 4. CLI Usage Patterns

Core commands (copy-pasteable):

```bash
# Basic generation
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10

# Deterministic with seed
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --faker-seed=1234

# Include invalid rows for testing
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=25 --invalid

# Override originating account
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=10 --originating.sortCode=401726 --originating.accountNumber=51779109
```

Use npm script: `npm run generate-file -- --fileType=EaziPay --rows=10`

## 5. Testing & Quality

- **Test Runner**: Vitest (`npm test`) with coverage reporting
- **Test Location**: `tests/unit/*.spec.ts` for unit tests
- **Determinism**: Set `FAKER_SEED` before running tests that check golden outputs
- **Coverage**: Target 90%+ with `vitest.config.ts` including `src/**/*.ts`, excluding specs

### Test Patterns

- Use `faker.seed()` for reproducible test data
- Test both valid and invalid row generation
- Verify preview metadata (row counts, validity flags)
- Assert file structure matches expected format

## 6. TypeScript & Build

- **ES Modules**: `"type": "module"` in package.json, `.js` extensions in imports
- **Build**: `npm run build` → `dist/` using `tsconfig.build.json`
- **Strict**: TypeScript strict mode enabled, explicit type annotations preferred
- **Node Target**: ES2022, Node 16+ runtime

## 7. File Generation Architecture

```
Request → Factory → Generator → FileWriter → { filePath, fileContent }
         ↳ Validation        ↳ Row Building
         ↳ Seed Setup        ↳ Serialization
```

Generators produce `string[][]` (rows), serializers handle CSV formatting, FileWriter manages output paths.

## 8. Common Patterns & Conventions

- **Error Handling**: Throw descriptive Error objects, no custom error types
- **Date Handling**: Use `luxon` DateTime, multiple format support via `EaziPayDateFormat`
- **Random Data**: Always check `process.env.FAKER_SEED` before `faker.seed()`
- **Naming**: Transaction codes as const unions ('01' | '17' | ...), not enums
- **Import Extensions**: Use `.js` in imports (ESM requirement)

## 9. Integration Points

- **External Projects**: Can be imported as library via `import { generateFile } from 'bacs-file-data-generator'`
- **Output Format**: Files written to `./output/{fileType}/` by default, configurable via `--outputRoot`
- **Related Projects**: Works with `bacs-report-api` workspace (see workspace root)

## 10. Current Limitations & Future

- **File Types**: Only EaziPay fully implemented (SDDirect, Bacs18PaymentLines in progress)
- **Output**: CSV only, no XML generation in this package
- **Validation**: Basic business rules, not full BACS compliance validation

## 11. Debugging & Development

```bash
# Run with debug output
npx ts-node src/cli/generate.ts --fileType=EaziPay --rows=5 --faker-seed=1234

# Test specific module
npm test -- validators.spec.ts

# Check build output
npm run build && node dist/cli/generate.js --help
```

## 12. When Unsure

- Check `src/lib/fileType/eazipay/generator.ts` for complete implementation patterns
- Follow factory pattern for new file types
- Preserve determinism with `FAKER_SEED` for any randomized behavior
- Keep public API stable in `src/index.ts` and `src/types.ts`
