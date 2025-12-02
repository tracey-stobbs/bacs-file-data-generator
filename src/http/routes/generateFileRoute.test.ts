// Co-located test for generateFileRoute
// Moved from tests/http-generate-file.spec.ts
import { test, expect } from 'vitest';
import Fastify from 'fastify';
import { registerGenerateFileRoute } from './generateFileRoute.js';

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- Fastify ready() is awaited in test context
test('POST /generate returns deterministic payload', async () => {
  const fastify = Fastify();
  void fastify.register(registerGenerateFileRoute);
  await fastify.ready();
  const response = await fastify.inject({
    method: 'POST',
    url: '/generate',
    payload: {
      fileType: 'EaziPay',
      rows: 2,
      fakerSeed: 1234,
    },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json() as {
    payload: string;
    metadata: { fileType: string; rows: number; format: string; seed: number; timestamp: number };
  };
  expect(typeof body.payload).toBe('string');
  expect(body.metadata.fileType).toBe('EaziPay');
  expect(body.metadata.rows).toBe(2);
  expect(typeof body.metadata.seed).toBe('number');
  expect(typeof body.metadata.timestamp).toBe('number');
});
