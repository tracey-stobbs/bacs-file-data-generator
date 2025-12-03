import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { generateFile } from '../../lib/factory.js';
import { ensureSeeded } from '../../lib/seeding/ensureSeeded.js';
import type { GenerationRequest } from '../../types.js';

// Removed legacy BodySchema in favor of inline validation within the route

type ValidationError = { error: string; detail?: Record<string, unknown> };

function isPositiveInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}

function parseSeed(val: unknown): number | undefined | ValidationError {
  if (val == null) return undefined;
  if (typeof val === 'number' && Number.isInteger(val)) return val;
  if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val);
  return { error: 'INVALID_SEED', detail: { provided: val } };
}

// legacy processing-date mapping removed; route validates inline per plan

export function registerGenerateFileRoute(app: FastifyInstance): void {
  // Single modern route aligned with implementation plan
  app.post(
    '/generate',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            fileType: { type: 'string', enum: ['EaziPay'] },
            rows: { type: 'integer', minimum: 1 },
            format: { type: 'string', enum: ['CSV', 'BacsCSV', 'JSON'] },
            fakerSeed: { anyOf: [{ type: 'integer' }, { type: 'string', pattern: '^\\d+$' }] },
            fixedTimestamp: { anyOf: [{ type: 'integer' }, { type: 'string', pattern: '^\\d+$' }] },
            originating: {
              type: 'object',
              properties: {
                sortCode: { type: 'string' },
                accountNumber: { type: 'string' },
                accountName: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          required: ['fileType', 'rows'],
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              payload: { type: 'string' },
              metadata: {
                type: 'object',
                properties: {
                  fileType: { type: 'string' },
                  rows: { type: 'integer' },
                  format: { type: 'string' },
                  seed: { type: 'integer' },
                  timestamp: { type: 'integer' },
                },
                required: ['fileType', 'rows', 'format', 'seed', 'timestamp'],
              },
            },
            required: ['payload', 'metadata'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          422: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          500: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = (req.body as Record<string, unknown>) || {};
      const fileType = body.fileType;
      const rows = body.rows;
      const format = (body.format as string | undefined) || 'CSV';
      const seedVal = body.fakerSeed;
      const fixedTsVal = body.fixedTimestamp;

      if (fileType !== 'EaziPay') {
        await reply.status(400).send({ error: 'UNSUPPORTED_FILE_TYPE' });
        return;
      }
      if (!isPositiveInt(rows)) {
        await reply.status(422).send({ error: 'INVALID_ROWS' });
        return;
      }
      const parsedSeed = parseSeed(seedVal);
      if (typeof parsedSeed === 'object' && 'error' in parsedSeed) {
        await reply.status(400).send(parsedSeed);
        return;
      }
      const timestamp =
        typeof fixedTsVal === 'number'
          ? fixedTsVal
          : typeof fixedTsVal === 'string' && /^\d+$/.test(fixedTsVal)
            ? Number(fixedTsVal)
            : Date.now();

      const seedUsed = parsedSeed != null ? ensureSeeded({ seed: parsedSeed }) : undefined;

      try {
        const mapped: GenerationRequest & { fakerSeed?: number; fixedTimestamp?: number } = {
          fileType: 'EaziPay',
          numberOfRows: rows as number,
          originating: (body.originating as GenerationRequest['originating']) || undefined,
          fakerSeed: seedUsed,
          fixedTimestamp: timestamp,
        };
        const result = await generateFile(mapped);
        const payload = result.fileContent;
        await reply.send({
          payload,
          metadata: {
            fileType: 'EaziPay',
            rows: rows as number,
            format,
            seed: seedUsed ?? 0,
            timestamp,
          },
        });
      } catch {
        await reply.status(500).send({ error: 'GENERATION_FAILED' });
      }
    }
  );
}
