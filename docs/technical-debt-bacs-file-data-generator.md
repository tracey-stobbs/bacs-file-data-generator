# Technical Debt – bacs-file-data-generator

Date (UTC): 2025-11-30

## Summary

Primary focus areas: tests-first remediation to reach ≥90% coverage, followed by extensibility beyond EaziPay, determinism, oversized generator refactor, and error model consistency. Prioritize fixing/removing outdated tests and relocating unit tests beside source before any structural code changes.

| Severity | High | Medium | Low |
| -------- | ---- | ------ | --- |
| Count    | 7    | 2      | 0   |

High Items: Factory gaps (TD-001, TD-010, TD-019), Oversized generator (TD-006), Determinism (TD-003, TD-014, TD-016), Error model (TD-005, TD-017). Medium: Unused dependency (TD-013), Seeding fragmentation (TD-016 already counted). Test locality (TD-002) spans all packages; treated High here.

## Findings

### Test-First Remediation Objectives

- Achieve ≥90% coverage with reliable, deterministic tests.
- Remove or update legacy/Skipped suites; co-locate unit tests next to modules.
- Stabilize golden outputs via seeds and deterministic filenames for test runs.

### TD-001 / TD-010 / TD-019 – Factory & Feature Gaps

`src/lib/factory.ts` only dispatches EaziPay; SDDirect generator exists; Bacs18 types referenced in writer but lack generation path.
Impact: Roadmap blockage for multi-file-type outputs.
Remediation:

- Introduce strategy map: `const handlers: Record<FileType, GeneratorStrategy>`.
- Implement SDDirect & Bacs18PaymentLines generators + preview interfaces.
- Add unit tests per handler; golden output seeds.

### TD-006 – Oversized EaziPay Generator

`src/lib/fileType/eazipay/generator.ts` (~625 lines) mixes validation, building, formatting, seeding.
Impact: Slows change velocity; high merge conflict risk.
Remediation:

- Extract: `validation.ts`, `rowBuilder.ts`, `formatting.ts`, `seeding.ts`.
- Define interfaces: `RowBuilder`, `Formatter`.
- Increase focused unit test coverage (edge cases: invalid rows, code validation).

### TD-003 / TD-014 / TD-016 – Determinism & Reproducibility

Areas:

- `fileWriter.ts`: `Math.random()` chooses extension (.csv/.txt).
- `sddirect/generator.ts`: random transaction code selection.
- Filenames use `Date.now()`.
- Inline seeding duplicated vs `ensureSeeded()`.
  Impact: Flaky golden tests; non-repeatable outputs.
  Remediation:
- Replace `Math.random` with injected RNG seeded from `FAKER_SEED`.
- Introduce `DeterminismContext` (clock + rng) with default seed/time override.
- Support `FIXED_TIMESTAMP` env for stable filenames.
- Enforce single call to `ensureSeeded()` at generator entry.

### TD-005 / TD-017 – Error Model Consistency

Raw `Error` thrown in `factory.ts`, `seed.ts`, generator validation closures.
Impact: Loss of structured codes; inconsistent HTTP responses when consumed upstream.
Remediation:

- Introduce `ErrorCodes.INVALID_SEED`, `ErrorCodes.UNSUPPORTED_FILE_TYPE`.
- Replace raw throws: `throw new AppError(ErrorCodes.UNSUPPORTED_FILE_TYPE, msg, 400, { fileType })`.

### TD-002 – Test Locality & Duplication (Priority)

Central tests in `tests/` plus co-located tests under `src/lib/fileType/eazipay/__tests__/`.
Impact: Fragmented test discovery; duplicated concerns (factory vs generateCsv).
Remediation (Immediate):

- Move unit tests beside source: `generateCsv.test.ts`, `factory.test.ts` next to modules.
- Delete legacy skipped suites (`validators.spec.ts`, `factory.spec.ts`).
- Tag integration tests (`.int.test.ts`) or keep in an `integration/` subtree.
- Add coverage gates (Vitest + coverage-v8) and track per-module thresholds.

### TD-013 – Unused Dependency: lts

Present in `package.json` but unused in source.
Remediation: Remove from dependencies; run `npm install`; add audit script.

### TD-016 – Fragmented Seeding Logic

Inline seeding try/catch in EaziPay generator duplicates `ensureSeeded()`.
Remediation: Remove inline seeding; call centralized `ensureSeeded()` once; add test verifying identical output across multiple invocation styles.

## Security & Compliance (Package-Specific)

- No hard-coded secrets detected.
- Path writing uses `safeJoinOutput` – low traversal risk.
- XML handled upstream (not constructed here directly) – low risk.

## Performance Notes

- Size of generator increases memory footprint on import; splitting enables tree-shaking and reduces cold start.
- Synchronous file writes (`generateFileWithFs`) may later benefit from async batching.

## Prioritized Action List

1. Fix and relocate tests; remove outdated/legacy suites; enforce ≥90% coverage (TD-002).
2. Introduce deterministic test utilities (seeded RNG and fixed timestamp hooks for tests) (TD-003/014/016).
3. Standardize AppError usage where tests assert structured errors (TD-005/017).
4. Implement multi-file-type factory strategy (TD-001/010/019).
5. Refactor EaziPay generator into modules (TD-006).
6. Remove unused dependency `lts` (TD-013).

## Reference Snippets

```ts
// Strategy map example
const handlers: Record<FileType, GeneratorStrategy> = {
  EaziPay: eaziStrategy,
  SDDirect: sdDirectStrategy,
  Bacs18PaymentLines: bacs18Strategy,
};
```

```ts
// Deterministic RNG example
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
```

## Glossary

- God File: Single file with multiple responsibilities.
- Determinism: Ability to reproduce identical outputs given the same inputs & seed.
- Strategy Pattern: Map keys to interchangeable handler implementations.
