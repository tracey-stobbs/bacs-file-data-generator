import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { generateFile } from '../../lib/factory.js';
import { ensureSeeded } from '../../lib/seeding/ensureSeeded.js';
import { createDeterminismContext } from '../../lib/determinism/context.js';
import { faker } from '@faker-js/faker';
import type { GenerationRequest } from '../../types.js';
import { DateTime } from 'luxon';

interface BodySchema {
  fileType?: string;
  rows?: unknown;
  seed?: unknown;
  fixedTimestamp?: unknown;
  processingDate?: unknown;
  originating?: {
    sortCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
  hasInvalidRows?: unknown;
}

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

function validateProcessingDate(val: unknown): string | undefined | ValidationError {
  if (val == null) return undefined;
  if (typeof val !== 'string')
    return { error: 'INVALID_PROCESSING_DATE_TYPE', detail: { provided: val } };
  const dt = DateTime.fromISO(val, { zone: 'utc' });
  if (!dt.isValid)
    return {
      error: 'INVALID_PROCESSING_DATE_FORMAT',
      detail: { provided: val },
    };
  return dt.toISODate();
}

function mapToGenerationRequest(body: BodySchema): GenerationRequest | ValidationError {
  if (body.fileType !== 'EaziPay')
    return {
      error: 'UNSUPPORTED_FILE_TYPE',
      detail: { fileType: body.fileType },
    };
  if (!isPositiveInt(body.rows)) return { error: 'INVALID_ROWS', detail: { rows: body.rows } };
  const seedParsed = parseSeed(body.seed);
  if (typeof seedParsed === 'object' && 'error' in seedParsed) return seedParsed;
  const processingDateParsed = validateProcessingDate(body.processingDate);
  if (typeof processingDateParsed === 'object' && 'error' in processingDateParsed)
    return processingDateParsed;
  return {
    fileType: 'EaziPay',
    numberOfRows: body.rows as number,
    hasInvalidRows: body.hasInvalidRows === true || body.hasInvalidRows === 'true',
    originating: body.originating,
  };
}

export function registerGenerateFileRoute(app: FastifyInstance): void {
  app.post(
    '/generate-file',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            fileType: { type: 'string', enum: ['EaziPay'] },
            rows: { type: 'integer', minimum: 1 },
            seed: { anyOf: [{ type: 'integer' }, { type: 'string', pattern: '^\\d+$' }] },
            fixedTimestamp: { anyOf: [{ type: 'integer' }, { type: 'string', pattern: '^\d+$' }] },
            processingDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            originating: {
              type: 'object',
              properties: {
                sortCode: { type: 'string' },
                accountNumber: { type: 'string' },
                accountName: { type: 'string' },
              },
              additionalProperties: true,
            },
            hasInvalidRows: {
              anyOf: [{ type: 'boolean' }, { type: 'string', enum: ['true', 'false'] }],
            },
          },
          required: ['fileType', 'rows'],
          additionalProperties: true,
        },
        response: {
          200: { type: 'string' },
          400: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          501: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          500: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = (req.body as BodySchema) || {};
      const mapped = mapToGenerationRequest(body);
      if ('error' in mapped) {
        await reply.status(mapped.error === 'UNSUPPORTED_FILE_TYPE' ? 501 : 400).send(mapped);
        return;
      }
      // Deterministic seeding via central gate
      let seedUsed: number | undefined;
      if (body.seed != null) {
        const parsed = parseSeed(body.seed);
        if (typeof parsed === 'object') {
          await reply.status(400).send(parsed);
          return;
        }
        seedUsed = ensureSeeded({ seed: parsed });
      } else {
        delete process.env.FAKER_SEED;
      }
      const fixedTsVal = body.fixedTimestamp;
      const fixedTs =
        typeof fixedTsVal === 'number'
          ? fixedTsVal
          : typeof fixedTsVal === 'string' && /^\d+$/.test(fixedTsVal)
            ? Number(fixedTsVal)
            : undefined;
      try {
        const result = await generateFile({ ...mapped, fakerSeed: seedUsed, fixedTimestamp: fixedTs });
        void reply.header('Content-Type', 'text/csv');
        void reply.header(
          'Content-Disposition',
          `attachment; filename="${mapped.fileType}-${(fixedTs ?? Date.now())}.csv"`
        );
        await reply.send(result.fileContent);
      } catch (err) {
        await reply.status(500).send({ error: 'GENERATION_FAILED' });
      }
    }
  );

  // New minimal, stricter route aligned with implementation plan
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
