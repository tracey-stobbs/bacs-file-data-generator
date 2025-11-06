(CLI & usage spec excerpt)

See `@docs/spec/cli-help.md` in the workspace for the full BACS Reports CLI help & usage specification. Key flags copied here for convenience:

- `--report <name>`: Report type (required) one of: `input`, `arudd`, `arucs`.
- `--rows <n>`: Number of rows to generate (default 10). Ignored when `--csv` supplied.
- `--csv=<path>`: Existing INPUT CSV to convert to XML.
- `--metadata=<path>`: Metadata JSON merged before overrides.
- `--outputRoot=<path>`: Override output base root.
- `--local`: Run generation in-process instead of HTTP POST.
- `FAKER_SEED`: stabilises generated CSV content for deterministic tests.
