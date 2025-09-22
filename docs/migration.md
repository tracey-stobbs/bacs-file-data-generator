# Migration Guide

How to migrate from the legacy combined API/generator code to this standalone generator package.

## 1. Install Package
```
npm install bacs-file-data-generator
```

## 2. Replace Imports
Legacy (example):
```ts
import { previewRows, generateFile } from 'legacy-ddcms/monolithPath';
```
New:
```ts
import { previewRows, generateFile } from 'bacs-file-data-generator';
```

## 3. Update Request Types
Old untyped objects should be replaced with strongly typed requests:
```ts
const req: GenerationRequest = {
  fileType: 'EaziPay',
  numberOfRows: 15,
  hasInvalidRows: true,
  sun: 'DEFAULT'
};
```

## 4. Handle Unsupported Types
If a fileType is not yet implemented (`SDDirect` generation), guard in caller until roadmap item complete.

## 5. Validate Behavior Parity
Run side-by-side generation (old vs new) for a sample of requests focusing on:
- Row counts & column counts
- Validity flag logic (invalid rows injection)
- Filename pattern structure

## 6. Remove Legacy Code
Once parity is confirmed, strip generator-specific modules from the API repository leaving only the HTTP layer calling this package.

## 7. Versioning & Lockfile
Pin a minor version range (e.g. `^0.1.x`) during rollout. Update after each validated feature addition.

## 8. Future Additions
When SDDirect generation lands, remove temporary guards and enable its routes/tests.

## 9. Troubleshooting
| Issue | Cause | Resolution |
|-------|-------|------------|
| Module import error (.js extension) | Mixed CJS/ESM resolution | Ensure `type: module` and NodeNext in host tsconfig |
| Validity flag mismatch | Old logic auto-set invalid rows differently | Align `hasInvalidRows` parameter and retest |

## 10. Contact / Ownership
Add ownership metadata here (TEAM / CHANNEL) before wider distribution.
