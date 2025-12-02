import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerGenerateFileRoute } from '../src/http/routes/generateFileRoute.js';

// We import route logic by reusing the HTTP server file's route section.
// For simplicity we replicate minimal route logic here (decoupling would be refactored later).
// (No direct import of server/http.ts to avoid .ts extension import issue under current tsconfig)

// Note: Direct injection into the Fastify instance is preferable over spinning the actual server process.

function buildTestApp(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  registerGenerateFileRoute(app as any);
  return app;
}

describe('POST /generate (injected)', () => {
  it('returns 400 for unsupported fileType', async (): Promise<void> => {
    const app = buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { fileType: 'BACS18', rows: 5 },
    });
    expect(res.statusCode).toBe(400);
  });
  it('enforces positive rows', async (): Promise<void> => {
    const app = buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { fileType: 'EaziPay', rows: 0 },
    });
    expect(res.statusCode).toBe(400);
  });
  it('produces deterministic output for same seed (payload only)', async (): Promise<void> => {
    const app = buildTestApp();
    const first = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { fileType: 'EaziPay', rows: 2, fakerSeed: 123 },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { fileType: 'EaziPay', rows: 2, fakerSeed: 123 },
    });
    const a = JSON.parse(String(first.body));
    const b = JSON.parse(String(second.body));
    expect(a.payload).toEqual(b.payload);
  });
  it('produces different output for different seeds', async (): Promise<void> => {
    const app = buildTestApp();
    const a = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { fileType: 'EaziPay', rows: 2, fakerSeed: 111 },
    });
    const b = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { fileType: 'EaziPay', rows: 2, fakerSeed: 222 },
    });
    expect(a.body).not.toEqual(b.body);
  });

  it('accepts originating details and returns CSV', async (): Promise<void> => {
    const app = buildTestApp();
    const sunName = 'SUN-C-0QZ5A';
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: {
        fileType: 'EaziPay',
        rows: 1,
        originating: {
          sortCode: '912291',
          accountNumber: '51491194',
          accountName: 'hOLDER-2W2',
          sunNumber: '797154',
          sunName,
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(String(res.body)).payload as string;
    expect(typeof payload).toBe('string');
    expect(payload.length).toBeGreaterThan(0);
  });
});
