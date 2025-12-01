import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { generateFile } from '../src/lib/factory.js';
import { faker } from '@faker-js/faker';

// We import route logic by reusing the HTTP server file's route section.
// For simplicity we replicate minimal route logic here (decoupling would be refactored later).
// (No direct import of server/http.ts to avoid .ts extension import issue under current tsconfig)

// Note: Direct injection into the Fastify instance is preferable over spinning the actual server process.

function buildTestApp(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  // Minimal route reproduction matching current implementation for EaziPay only
  app.post('/generate-file', async (req, reply): Promise<void> => {
    const body = (req.body as Record<string, unknown>) || {};
    if (body.fileType !== 'EaziPay') {
      await reply.status(501).send({ error: 'UNSUPPORTED_FILE_TYPE' });
      return;
    }
    if (typeof body.rows !== 'number' || (body.rows as number) <= 0) {
      await reply.status(400).send({ error: 'INVALID_ROWS' });
      return;
    }
    if (body.seed != null) {
      const seedNum = typeof body.seed === 'number' ? body.seed : Number(body.seed);
      if (!Number.isInteger(seedNum)) {
        await reply.status(400).send({ error: 'INVALID_SEED' });
        return;
      }
      process.env.FAKER_SEED = String(seedNum);
      try {
        faker.seed(seedNum);
      } catch {
        /* ignore */
      }
    }
    const result = await generateFile({
      fileType: 'EaziPay',
      numberOfRows: body.rows as number,
      originating: body.originating as any,
    });
    void reply.header('Content-Type', 'text/csv');
    await reply.send(result.fileContent);
  });
  return app;
}

describe('POST /generate-file (injected)', () => {
  it('returns 501 for unsupported fileType', async (): Promise<void> => {
    const app = buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: { fileType: 'BACS18', rows: 5 },
    });
    expect(res.statusCode).toBe(501);
  });
  it('enforces positive rows', async (): Promise<void> => {
    const app = buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: { fileType: 'EaziPay', rows: 0 },
    });
    expect(res.statusCode).toBe(400);
  });
  it('produces deterministic output for same seed', async (): Promise<void> => {
    const app = buildTestApp();
    const first = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: { fileType: 'EaziPay', rows: 2, seed: 123 },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: { fileType: 'EaziPay', rows: 2, seed: 123 },
    });
    expect(first.body).toEqual(second.body);
  });
  it('produces different output for different seeds', async (): Promise<void> => {
    const app = buildTestApp();
    const a = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: { fileType: 'EaziPay', rows: 2, seed: 111 },
    });
    const b = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: { fileType: 'EaziPay', rows: 2, seed: 222 },
    });
    expect(a.body).not.toEqual(b.body);
  });

  it('applies originating.sunName to column 11', async (): Promise<void> => {
    const app = buildTestApp();
    const sunName = 'SUN-C-0QZ5A';
    const res = await app.inject({
      method: 'POST',
      url: '/generate-file',
      payload: {
        fileType: 'EaziPay',
        rows: 3,
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
    const lines = String(res.body)
      .split(/\r?\n/)
      .filter((l) => l.length > 0);
    expect(lines.length).toBe(3);
    for (const line of lines) {
      const fields = line.split(',');
      expect(fields.length).toBeGreaterThanOrEqual(11);
      expect(fields[10]).toBe(sunName);
    }
  });
});
