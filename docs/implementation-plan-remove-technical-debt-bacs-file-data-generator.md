# Implementation Plan — Remove Technical Debt in `bacs-file-data-generator`

Date (UTC): 2025-12-01

Objective: Deliver a phased, test-first, big-bang remediation plan for the `bacs-file-data-generator` package. Treat this package as a greenfield HTTP data generator in user-facing aspects, while internally coordinating comprehensive removal and replacement of deprecated surfaces. No orchestration or side-effects beyond returning generated payloads via HTTP.

Assumptions

- Package exposes a minimal Fastify HTTP API plus reusable library functions.
- External consumers migrate from CLI to HTTP API.
- Environment provides `FAKER_SEED` and optionally `FIXED_TIMESTAMP` for deterministic outputs.
- Reference-only folders (e.g., `CuddleYourCat.code-notes`, tools/resources) remain read-only.

Acceptance Gates (must pass)

- ESLint passes; Prettier formatting applied.
- Typecheck passes.
- Vitest coverage ≥90% overall; critical modules ≥95% where feasible.
- AppError used with codes: `UNSUPPORTED_FILE_TYPE`, `INVALID_SEED`, `VALIDATION_FAILED`.
- No tracked output artifacts remain (purged and `.gitignore` updated).
- CLI and any Express code removed; Fastify HTTP API in place.
- Factory includes `EaziPay`, `SDDirect` (SmartDebit), `Bacs18PaymentLines` strategies.
- EaziPay generator modularized (no file >300 lines).

## Phase 0 — Inventory & Safety Net

Goal: Capture the baseline and enumerate all deprecated assets before code removal.

- Entry Criteria:
  - Package builds locally; tests run (even if flaky).
  - Repo in consistent state.
- Exit Criteria:
  - Baseline coverage snapshot saved.
  - Deprecated assets enumerated.
  - Dependency audit snapshot captured.
- Tasks:
  - Run lint/format/tests with coverage to capture baseline:
    - `npm run lint`
    - `npx prettier --check .`
    - `npm test -- --coverage`
  - Enumerate deprecated surfaces:
    - CLI entry `src/cli/generate.ts`.
    - Any Express-based server under `src/server/**` or `src/http/**` using Express.
    - NPM scripts referencing CLI/Express.
    - Legacy harnesses referencing CLI/Express.
  - Dependency audit: confirm unused `lts` in `package.json`.
- Risks:
  - Flaky tests distort baseline.
  - Legacy tests inflate coverage.
- Mitigation:
  - Record baseline, but plan removal in Phase 2.
- Rollback:
  - None (read-only capture).

## Phase 1 — Remove CLI and Express; Introduce Fastify

Goal: Delete deprecated interfaces and add a minimal Fastify HTTP API.

- Entry Criteria:
  - Deprecated assets list approved.
- Exit Criteria:
  - CLI and Express removed.
  - Fastify server present with `POST /generate` route.
  - Scripts updated to run the server.
- Tasks:
  - Delete `src/cli/generate.ts` and Express server files.
  - Remove NPM scripts invoking CLI/Express.
  - Add `src/http/server.ts` with Fastify setup and minimal route(s).
  - Add NPM scripts: `serve`, `dev` (nodemon), keeping `test` intact.
- Risks:
  - External scripts break due to CLI removal.
- Mitigation:
  - Provide a short migration doc internally describing HTTP usage.
- Rollback:
  - Temporary CLI wrapper (script) if necessary—avoid reintroducing Express.

## Phase 2 — Test Relocation & Coverage Gate

Goal: Co-locate unit tests beside their SUTs and enforce coverage thresholds.

- Entry Criteria:
  - Fastify skeleton in place.
- Exit Criteria:
  - Unit tests live next to modules.
  - Obsolete/duplicate central tests removed.
  - Coverage thresholds enforced via Vitest.
- Tasks:
  - Move tests: `factory.test.ts`, per-file-type generator tests, determinism tests.
  - Delete skipped/legacy suites (e.g., old validator/factory specs) and duplicates in `tests/`.
  - Configure Vitest coverage (V8) with ≥90% overall and module targets.
  - Add Fastify `inject` route tests for `POST /generate`.
- Risks:
  - Temporary coverage drop.
- Mitigation:
  - Incrementally relocate with module-focused assertions.
- Rollback:
  - Keep legacy tests on a branch for reference.

## Phase 3 — Determinism Layer

Goal: Achieve deterministic outputs via seeded RNG and optional fixed timestamp; centralize seeding.

- Entry Criteria:
  - Co-located tests stable; Fastify route functional.
- Exit Criteria:
  - Introduced `DeterminismContext` (rng + clock).
  - Single `ensureSeeded()` gate used by generators.
  - All randomness uses injected RNG and clock.
- Tasks:
  - Add `src/lib/determinism/context.ts`:
    - `makeRng(seed: number): () => number` (LCG).
    - `clock.now(envFixedTimestamp?: number): number`.
  - Implement `ensureSeeded()` in `src/lib/seeding/ensureSeeded.ts` and remove inline seed logic from generators.
  - Replace `Math.random()` and `Date.now()` usage in generation/file-writing with injected RNG/clock.
  - Support `FIXED_TIMESTAMP` env or `fixedTimestamp` input.
  - Tests for identical outputs across invocations with same seed/time.
- Risks:
  - Performance overhead vs `Math.random`.
  - Subtle formatting shifts.
- Mitigation:
  - Lightweight LCG; micro-bench comment notes; golden comparisons.
- Rollback:
  - Optional flag to bypass fixed timestamp (not used in tests).

## Phase 4 — Factory Strategy Expansion

Goal: Complete multi-file-type support via a Strategy Pattern.

- Entry Criteria:
  - Determinism wired; tests passing.
- Exit Criteria:
  - `handlers: Record<FileType, GeneratorStrategy>` implemented.
  - Strategies for `EaziPay`, `SDDirect`, `Bacs18PaymentLines` wired.
  - Validators integrated; handler tests pass.
- Tasks:
  - Implement factory with strategies and type-safe interfaces.
  - Add validators per file type (reusable rules under `src/validators`).
  - Tests: per-handler deterministic outputs; unsupported type throws `AppError` with `UNSUPPORTED_FILE_TYPE`.
- Risks:
  - Missing SmartDebit or Bacs18 details.
- Mitigation:
  - Use existing references and minimum viable compliant output; annotate TODOs where spec gaps exist.
- Rollback:
  - Feature flag individual strategies if needed.

## Phase 5 — EaziPay Generator Refactor

Goal: Split oversized generator into focused modules; unify error model.

- Entry Criteria:
  - Factory expanded; determinism stable.
- Exit Criteria:
  - Files: `validation.ts`, `rowBuilder.ts`, `formatting.ts`, `seeding.ts` (≤300 lines each).
  - `AppError` used consistently with codes.
  - Unit tests per module + integrated behavior.
- Tasks:
  - Extract responsibilities:
    - `validation.ts` for input schema and checks.
    - `rowBuilder.ts` for deterministic row construction using RNG.
    - `formatting.ts` for CSV/variant assembly and JSON.
    - `seeding.ts` to re-export central `ensureSeeded()` for package-local convenience.
  - Define interfaces: `RowBuilder`, `Formatter` for clarity and testability.
  - Replace raw `Error` with `AppError` across generator modules.
  - Add unit tests covering edge cases (invalid rows, code validation, formatting).
- Risks:
  - Formatting changes and edge-case handling regressions.
- Mitigation:
  - Golden comparison tests; explicit boundary tests.
- Rollback:
  - Keep original generator in a temporary branch for quick diff/restore.

## Phase 6 — Artifact Purge & CI Adjustments

Goal: Ensure repo cleanliness and enforce gates in CI.

- Entry Criteria:
  - Refactors complete; tests strong.
- Exit Criteria:
  - Output artifacts purged; `.gitignore` updated.
  - `lts` removed; lockfile updated.
  - CI runs lint/format/typecheck/coverage gates.
- Tasks:
  - Delete tracked outputs:
    - `packages/bacs-file-data-generator/output/`
    - `gitbacsbacs-file-data-generatoroutputtest-cli-smoke/`
    - Any stray golden CSVs under docs/tests/temp.
  - Update `.gitignore` to exclude ephemeral outputs:
    - `/output/`, `/output-tests/`, `/tmp/`, `/**/__tmp*/`.
  - Remove `lts` from `package.json`; run `npm install`.
  - Add CI gates (ESLint, Prettier, typecheck, Vitest coverage).
- Risks:
  - Accidental deletion of required fixtures.
- Mitigation:
  - Replace fixtures with deterministic in-test generation to temp paths.
- Rollback:
  - Recover via Git history.

## HTTP API Design (Fastify)

- Server: `src/http/server.ts`
- Route: `POST /generate`
  - Request body:
    ```json
    {
      "fileType": "EaziPay" | "SDDirect" | "Bacs18PaymentLines",
      "rows": 1,
      "format": "CSV" | "BacsCSV" | "JSON",
      "fakerSeed": 1234,
      "fixedTimestamp": 1733011200000
    }
    ```
  - Validation:
    - Use Fastify schema or Zod: `fileType` enum, `rows > 0`, `format` enum.
    - `fakerSeed` integer ≥0; `fixedTimestamp` integer (optional).
  - Behavior:
    - Build `DeterminismContext` from seed and timestamp.
    - Call factory strategy with `{ fileType, rows, format }` and context.
    - Response:
      ```json
      {
        "payload": "<CSV or JSON>",
        "metadata": {
          "fileType": "EaziPay",
          "rows": 10,
          "format": "CSV",
          "seed": 1234,
          "timestamp": 1733011200000
        }
      }
      ```
  - Error handling:
    - Map `AppError.code` → HTTP:
      - `UNSUPPORTED_FILE_TYPE` → 400
      - `INVALID_SEED` → 400
      - `VALIDATION_FAILED` → 422
    - Fallback: 500 for unknown errors.

## Test Strategy

- Co-located unit tests (`*.test.ts`) beside modules.
- Fastify route tests using `server.inject` to ensure deterministic payloads.
- Coverage:
  - Overall ≥90%; critical modules (factory, determinism, error mapping) ≥95%.
  - Use V8 coverage; collect from `src/**`.
- Deterministic utilities:
  - Test helper for `DeterminismContext` with fixed seed/timestamp.
  - Golden comparisons in temp directories only.

## Design Patterns Justification

- Strategy Pattern:
  - Maps `fileType` to generator strategies via a type-safe `handlers` record.
  - Improves separation of concerns and extensibility; new file types added without modifying core factory logic.

## Determinism Design

- RNG: LCG implementation `makeRng(seed)` returns `() => number` in [0,1).
- Clock: `clock.now()` defaulting to `Date.now()`, optionally overridden by `FIXED_TIMESTAMP` env or `fixedTimestamp` input.
- Single Seeding Gate: `ensureSeeded()` invoked once at generator entry.
- Replace `Math.random()` and `Date.now()` across generators/writers with injected context.

## Error Model Specification

- Error Codes:
  - `UNSUPPORTED_FILE_TYPE`
  - `INVALID_SEED`
  - `VALIDATION_FAILED`
- Use `AppError(code, message, httpStatus, details?)` consistently in factory, validators, generators.
- HTTP mapping handled by Fastify error handler.

## Refactor Boundaries (EaziPay)

- Replace single monolithic file with modules:
  - `validation.ts` — input schema and validation.
  - `rowBuilder.ts` — deterministic row creation via RNG.
  - `formatting.ts` — CSV/Bacs variants and JSON serialization.
  - `seeding.ts` — local bridge to centralized `ensureSeeded()`.
- Interfaces:
  - `RowBuilder` → `buildRow(rng, index, context)`.
  - `Formatter` → `toCsv(rows)` / `toJson(rows)`.

## Dependency & Artifact Cleanup

- Remove `lts` from `package.json` → `npm install`.
- Purge tracked outputs:
  - `packages/bacs-file-data-generator/output/`
  - `gitbacsbacs-file-data-generatoroutputtest-cli-smoke/`
  - Stray golden CSVs.
- Update `.gitignore`:
  - `/output/`, `/output-tests/`, `/tmp/`, `/**/__tmp*/`.
- CI Gates:
  - Lint: `npm run lint`
  - Format: `npx prettier --check .` (or `--write .`)
  - Typecheck: `tsc --noEmit` or `npm run build`
  - Tests: `npm test -- --coverage`

## Risks & Mitigations

- CLI removal breaks external tooling:
  - Mitigation: Provide migration guidance to use the HTTP API.
- Determinism layer performance concerns:
  - Mitigation: Lightweight RNG; micro-bench notes; acceptable overhead documented.
- Formatting differences post-refactor:
  - Mitigation: Golden comparisons and targeted formatting tests.

## Commands (Developer Reference)

```bash
# Lint and format
npm run lint
npx prettier --check .
# Auto-format if needed
npx prettier --write .

# Typecheck
npm run build

# Tests with coverage
npm test -- --coverage
```

## Next Actions

- Confirm no Express code remains; remove CLI scripts.
- Scaffold `src/http/server.ts` with `POST /generate` using Fastify.
- Relocate unit tests beside modules and enable coverage thresholds.
- Implement `DeterminismContext` and unify `ensureSeeded()`.
- Expand factory strategies for `EaziPay`, `SDDirect`, and `Bacs18PaymentLines` with validators and tests.
- Refactor EaziPay into `validation.ts`, `rowBuilder.ts`, `formatting.ts`, `seeding.ts`.
- Purge output artifacts; update `.gitignore` and remove `lts`; wire CI gates.

# REMOVAL OF TECHNICAL DEBT IMPLEMENTATION PLAN (bacs-file-data-generator)

## High-level plan:

- Phased roadmap (Phase 0–6) with entry/exit criteria, tasks, risks, mitigations, rollback.
- Fastify HTTP API design and validation.
- Unit test strategy and coverage gates.
- Strategy Pattern expansion for multi-file types.
- Determinism layer, error model, refactor boundaries, dependency/artifact cleanup.
- Acceptance summary and next actions.

**Phased Roadmap (Phase 0–6)**

- Phase 0: Inventory & Safety Net
  - Entry: Current branch builds locally; Vitest runs; repo in a consistent state; identify deprecated assets.
  - Exit: Baseline coverage report stored; enumerated deprecated paths; dependency audit snapshot.
  - Tasks:
    - Run `npm run lint`, `npx prettier --check .`, `npm test -- --coverage` in the package.
    - Enumerate deprecated surfaces: `src/cli/generate.ts` (CLI), any Express HTTP server files (`src/server/**`, `src/http/**`), npm scripts referencing CLI/Express, legacy integration harnesses referencing those surfaces.
    - Coverage snapshot and module-level coverage notes (focus on factory and EaziPay generator).
    - Dependency audit: confirm presence of unused `lts`.
  - Risks: Flaky tests due to non-determinism; coverage overstated by obsolete tests.
  - Mitigation: Freeze snapshot, tag legacy tests as candidates for removal in Phase 2.
  - Rollback: None—read-only inventory and baseline capture.

- Phase 1: Remove CLI and Express; Introduce Fastify
  - Entry: Deprecated assets enumerated; stakeholders accept deprecation.
  - Exit: CLI and Express fully removed; minimal Fastify server present; scripts updated.
  - Tasks:
    - Delete `src/cli/generate.ts` and any Express server files; remove npm scripts referencing them.
    - Add `src/http/server.ts` with Fastify:
      - `POST /generate` route.
      - JSON body validation via schema (Zod or Fastify schema).
      - Deterministic seed handling (`FAKER_SEED`), optional `FIXED_TIMESTAMP`.
    - Update package.json scripts: `start`, `dev`, `test` remain; remove CLI runs; add `serve`.
  - Risks: External scripts relying on CLI break.
  - Mitigation: Provide migration doc snippet (internal) describing usage of HTTP API; coordinate replacement in upstream repos.
  - Rollback: Reintroduce CLI via a small wrapper script if blocking issues arise (avoid Express).

- Phase 2: Test Relocation & Coverage Gate
  - Entry: Fastify skeleton in place; old tests identified.
  - Exit: Unit tests co-located with SUT; obsolete/duplicate central tests removed; coverage threshold enforced.
  - Tasks:
    - Move unit tests beside modules: `src/lib/factory.test.ts`, `src/lib/fileType/eazipay/.../*.test.ts`.
    - Delete legacy skipped suites (`validators.spec.ts`, `factory.spec.ts`) and duplicates in `tests/`.
    - Add Vitest config for coverage (V8) with thresholds: overall ≥90%; critical modules ≥95% (factory, determinism).
    - Add Fastify `inject` tests for `POST /generate`.
  - Risks: Temporary coverage dip while relocating; brittle imports.
  - Mitigation: Incremental relocation with module-focused coverage; use ESM-safe imports.
  - Rollback: Keep a backup of legacy tests in a branch (not in repo).

- Phase 3: Determinism Layer
  - Entry: Tests co-located and running; Fastify route in place.
  - Exit: Deterministic RNG and clock abstractions integrated; single `ensureSeeded()` in generators; optional fixed timestamp respected.
  - Tasks:
    - Add `src/lib/determinism/context.ts`: `makeRng(seed)`, `clock.now()` with `FIXED_TIMESTAMP` override.
    - Consolidate seeding: implement `ensureSeeded()` and call once per request.
    - Replace `Math.random()` in generators/file writer with injected RNG.
    - Stabilize filenames via deterministic timestamp when `FIXED_TIMESTAMP` provided.
    - Tests for identical outputs across multiple invocations with same seed/time.
  - Risks: Performance concerns with seeded RNG; subtle formatting changes.
  - Mitigation: Micro-bench warm assertions (simple timing), golden comparison test.
  - Rollback: Toggle determinism via env flag for emergency, but keep seed defaults on in tests.

- Phase 4: Factory Strategy Expansion
  - Entry: Determinism context wired; tests stable.
  - Exit: Strategy map supports EaziPay, SDDirect, Bacs18PaymentLines; validators integrated; handler tests passing.
  - Tasks:
    - Implement `handlers: Record<FileType, GeneratorStrategy>` in `src/lib/factory.ts`.
    - Wire strategies: `eaziStrategy`, `sdDirectStrategy`, `bacs18Strategy`.
    - Add validators per file type (reusable validation module).
    - Unit tests per handler with deterministic seeds; error codes for unsupported types.
  - Risks: Missing SmartDebit details or Bacs18 spec nuances.
  - Mitigation: Use existing references from the package; if a blocking spec detail is missing, stub minimal compliant output and mark TODO.
  - Rollback: Feature-flag new strategies if needed.

- Phase 5: EaziPay Generator Refactor
  - Entry: Multi-type factory green; determinism OK.
  - Exit: EaziPay split into modules; error model unified; files ≤300 lines.
  - Tasks:
    - Split `src/lib/fileType/eazipay/generator.ts` into:
      - `validation.ts` — checks and schema.
      - `rowBuilder.ts` — constructs row data (uses injected RNG).
      - `formatting.ts` — CSV formatting and variants.
      - `seeding.ts` — delegates to central `ensureSeeded()` or re-exports for convenience (no duplication).
    - Introduce interfaces: `RowBuilder`, `Formatter`.
    - Replace raw `Error` with `AppError` throughout.
    - Unit tests for each module and integrated generator behavior.
  - Risks: Refactor introduces subtle formatting differences.
  - Mitigation: Golden output comparisons; explicit tests for edge cases.
  - Rollback: Keep original generator in a temporary branch for quick diff/restore.

- Phase 6: Artifact Purge & CI Adjustments
  - Entry: Refactor done; tests strong.
  - Exit: Repo clean of output artifacts; `.gitignore` updated; CI runs lint/format/typecheck/coverage gates; dependency cleanup completed.
  - Tasks:
    - Identify and delete tracked outputs:
      - output
      - `gitbacsbacs-file-data-generatoroutputtest-cli-smoke/`
      - Any stray golden CSVs under `docs`, `tests`, or package temp folders.
    - Update `.gitignore` to exclude ephemeral outputs: output, `/tmp/`, `/__tmp*/`, output-tests.
    - Remove unused dependency `lts` from package.json; run `npm install`.
    - Add CI gates: ESLint, Prettier, TypeScript typecheck, Vitest coverage thresholds.
  - Risks: Accidental deletion of needed fixtures.
  - Mitigation: Replace fixtures with deterministic test generation in temp paths; document.
  - Rollback: Recover from Git history if needed.

**HTTP API Design (Fastify)**

- Server: `src/http/server.ts`
- Route: `POST /generate`
  - Request body: `{ fileType: 'EaziPay'|'SDDirect'|'Bacs18PaymentLines', rows: number, format: 'CSV'|'BacsCSV'|'JSON', fakerSeed?: number, fixedTimestamp?: number }`
  - Validation:
    - Fastify schema or Zod: required `fileType`, `rows > 0`, `format` from enum.
    - `fakerSeed` must be integer ≥0; `fixedTimestamp` optional integer.
  - Behavior:
    - Build `DeterminismContext` from seed and timestamp.
    - Call factory strategy for `fileType` with `rows`, `format`, and context.
    - Return payload string (CSV variants) or JSON plus `metadata: { fileType, rows, format, seed, timestamp }`.
  - Error handling:
    - Map `AppError.code` to HTTP statuses:
      - `UNSUPPORTED_FILE_TYPE` → 400
      - `INVALID_SEED` → 400
      - `VALIDATION_FAILED` → 422
    - Unknown → 500 with generic message.

**Test Strategy**

- Co-located unit tests:
  - `src/lib/factory.test.ts`, `src/lib/determinism/context.test.ts`, `src/lib/fileType/eazipay/*.test.ts`, similarly for `sddirect` and `bacs18`.
- HTTP route tests:
  - Use Fastify’s `inject` to test `POST /generate`.
  - Assert deterministic payload and metadata with `fakerSeed` + `fixedTimestamp`.
- Coverage:
  - Overall ≥90%; critical modules (factory, determinism, error mapping) ≥95%.
  - Vitest config: enable V8 coverage; collect from `src/**`.
- Deterministic utilities:
  - A test helper to create `DeterminismContext` consistently.
  - Golden comparison tests using seeded outputs; write to temp directories only.

**Design Patterns Justification**

- Strategy Pattern:
  - Fits multi-file-type generation by mapping `fileType` to interchangeable generators with common interface.
  - Encourages single responsibility and easy extensibility (add new types without modifying core logic).

**Determinism Design**

- RNG: `makeRng(seed: number)` (LCG) returning `() => number` in [0,1).
- Clock: `clock.now()` defaulting to `Date.now()`, overridden by `FIXED_TIMESTAMP` or `fixedTimestamp` input.
- Seeding gate: `ensureSeeded()` called once at generator entry, removing duplicate inline seeding.
- All randomness (codes, filenames, extensions) driven by injected RNG and clock.

**Error Model Spec**

- Codes:
  - `UNSUPPORTED_FILE_TYPE`
  - `INVALID_SEED`
  - `VALIDATION_FAILED`
- Implementation:
  - `AppError(code, message, httpStatus, details?)` used consistently in factory, validators, and generators.
- HTTP mapping:
  - 400 for unsupported type/invalid seed; 422 for validation failures; 500 default fallback.

**Refactor Boundaries**

- Replace EaziPay “god file” with:
  - `validation.ts` — checks input schema, rows > 0, format allowed.
  - `rowBuilder.ts` — builds rows deterministically (uses RNG).
  - `formatting.ts` — CSV/variant assembly.
  - `seeding.ts` — removes duplication; re-exports central `ensureSeeded()` if needed.
- Interfaces:
  - `RowBuilder` → `buildRow(rng, index, context)`
  - `Formatter` → `toCsv(rows)` / `toJson(rows)`
- Keep files ≤300 lines; focus on modular, testable units.

**Dependency & Artifact Cleanup**

- Remove `lts` from package.json and run install.
- Purge tracked outputs:
  - output
  - `gitbacsbacs-file-data-generatoroutputtest-cli-smoke/`
  - Any stray golden CSVs in repo.
- `.gitignore` additions:
  - output
  - output-tests
  - `/tmp/`
  - `/**/__tmp*/`
- CI gates:
  - Lint: `npm run lint`
  - Format: `npx prettier --check .` (or `--write .`)
  - Typecheck: `npm run build` or `tsc --noEmit`
  - Tests with coverage: `npm test -- --coverage`

**Acceptance Criteria Summary**

- CLI and Express removed; Fastify HTTP API present with `POST /generate`.
- No stray output artifacts tracked by git; `.gitignore` excludes ephemeral outputs.
- Factory handlers implemented for EaziPay, SDDirect, Bacs18PaymentLines with passing unit tests.
- Deterministic runs reproducible via `fakerSeed` + `fixedTimestamp`.
- Coverage ≥90% overall; CI enforces thresholds.
- EaziPay generator modularized; no file >300 lines.
- Lint + typecheck clean; unused dependency `lts` removed.
- AppError used with specified error codes; HTTP mapping correct.

**Risks & Mitigations**

- Removing CLI breaks external scripts:
  - Mitigation: Provide a short migration doc to call `POST /generate`.
- Determinism layer performance:
  - Mitigation: Minimal LCG; optional micro-bench; acceptable overhead documented.
- Formatting changes post-refactor:
  - Mitigation: Golden comparison tests before/after; assert exact CSV formatting.

**ESLint/Prettier & Vitest Commands**

```bash
# From the package root
npm run lint
npx prettier --check .
# or auto-fix formatting
npx prettier --write .

# Typecheck (adjust if package has build script)
npm run build

# Run tests with coverage (V8)
npm test -- --coverage
```

**Next Actions**

- Confirm there’s no Express code path remaining; remove CLI scripts.
- Scaffold Fastify `POST /generate` with schema validation.
- Move unit tests beside SUT and enable coverage thresholds.
- Implement determinism context and unify `ensureSeeded()`.
- Expand factory strategies for SDDirect and Bacs18PaymentLines with validator/tests.
- Refactor EaziPay into `validation.ts`, `rowBuilder.ts`, `formatting.ts`, `seeding.ts`.
- Purge output artifacts and update `.gitignore`; remove `lts`; wire CI gates.

Assumptions

- Package exposes HTTP API plus reusable library functions; external consumers migrate from CLI to HTTP.
- Environment supplies `FAKER_SEED`; tests may use `FIXED_TIMESTAMP`.
