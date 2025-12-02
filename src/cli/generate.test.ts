// Co-located CLI smoke test for generate.ts
// Moved from src/integration/cli-smoke.test.ts
import { test, expect } from 'vitest';
import { generateFile } from './generate.js';

test('CLI smoke test: generates EaziPay file in-memory', async () => {
  const result = await generateFile({ fileType: 'EaziPay', numberOfRows: 2 });
  expect(typeof result.fileContent).toBe('string');
  expect(result.fileContent.length).toBeGreaterThan(0);
});
