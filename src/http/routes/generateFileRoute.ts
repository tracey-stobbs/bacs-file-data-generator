import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateFile } from "../../lib/factory.js";
import { faker } from "@faker-js/faker";
import type { GenerationRequest } from "../../types.js";
import { DateTime } from "luxon";

interface BodySchema {
  fileType?: string;
  rows?: unknown;
  seed?: unknown;
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
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}

function parseSeed(val: unknown): number | undefined | ValidationError {
  if (val == null) return undefined;
  if (typeof val === "number" && Number.isInteger(val)) return val;
  if (typeof val === "string" && /^\d+$/.test(val)) return Number(val);
  return { error: "INVALID_SEED", detail: { provided: val } };
}

function validateProcessingDate(
  val: unknown,
): string | undefined | ValidationError {
  if (val == null) return undefined;
  if (typeof val !== "string")
    return { error: "INVALID_PROCESSING_DATE_TYPE", detail: { provided: val } };
  const dt = DateTime.fromISO(val, { zone: "utc" });
  if (!dt.isValid)
    return {
      error: "INVALID_PROCESSING_DATE_FORMAT",
      detail: { provided: val },
    };
  return dt.toISODate();
}

function mapToGenerationRequest(
  body: BodySchema,
): GenerationRequest | ValidationError {
  if (body.fileType !== "EaziPay")
    return {
      error: "UNSUPPORTED_FILE_TYPE",
      detail: { fileType: body.fileType },
    };
  if (!isPositiveInt(body.rows))
    return { error: "INVALID_ROWS", detail: { rows: body.rows } };
  const seedParsed = parseSeed(body.seed);
  if (typeof seedParsed === "object" && "error" in seedParsed)
    return seedParsed;
  const processingDateParsed = validateProcessingDate(body.processingDate);
  if (
    typeof processingDateParsed === "object" &&
    "error" in processingDateParsed
  )
    return processingDateParsed;
  return {
    fileType: "EaziPay",
    numberOfRows: body.rows as number,
    hasInvalidRows:
      body.hasInvalidRows === true || body.hasInvalidRows === "true",
    originating: body.originating,
  };
}

export function registerGenerateFileRoute(app: FastifyInstance): void {
  app.post(
    "/generate-file",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = (req.body as BodySchema) || {};
      const mapped = mapToGenerationRequest(body);
      if ("error" in mapped) {
        await reply
          .status(mapped.error === "UNSUPPORTED_FILE_TYPE" ? 501 : 400)
          .send(mapped);
        return;
      }
      // Deterministic seeding
      if (body.seed != null) {
        const parsed = parseSeed(body.seed);
        if (typeof parsed === "object") {
          await reply.status(400).send(parsed);
          return;
        }
        process.env.FAKER_SEED = String(parsed);
        try {
          faker.seed(parsed);
        } catch {
          /* ignore */
        }
      } else {
        delete process.env.FAKER_SEED;
      }
      try {
        const result = await generateFile(mapped);
        void reply.header("Content-Type", "text/csv");
        void reply.header(
          "Content-Disposition",
          `attachment; filename="${mapped.fileType}-${Date.now()}.csv"`,
        );
        await reply.send(result.fileContent);
      } catch (err) {
        await reply.status(500).send({ error: "GENERATION_FAILED" });
      }
    },
  );
}
