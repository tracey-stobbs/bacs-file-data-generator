import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { generateFile } from "../src/lib/factory.js";
import type { GenerationRequest } from "../src/types.js";
import pino from "pino";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";

const logger = pino({ level: process.env.DEBUG ? "debug" : "info" });
const app = Fastify({ logger: false });

interface Body {
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

function validateAndMap(body: Body): GenerationRequest | ValidationError {
  if (body.fileType !== "EaziPay") {
    return {
      error: "UNSUPPORTED_FILE_TYPE",
      detail: { fileType: body.fileType },
    };
  }
  const rows = body.rows;
  if (!isPositiveInt(rows)) return { error: "INVALID_ROWS", detail: { rows } };
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
    numberOfRows: rows,
    hasInvalidRows:
      body.hasInvalidRows === true || body.hasInvalidRows === "true",
    originating: body.originating,
  };
}

app.post(
  "/generate-file",
  async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = (req.body as Body) || {};
    const mapped = validateAndMap(body);
    if ("error" in mapped) {
      await reply
        .status(mapped.error === "UNSUPPORTED_FILE_TYPE" ? 501 : 400)
        .send(mapped);
      return;
    }
    // Deterministic seed setup BEFORE any faker usage
    if (body.seed != null) {
      const seedParsed = parseSeed(body.seed);
      if (typeof seedParsed === "object") {
        await reply.status(400).send(seedParsed);
        return;
      }
      process.env.FAKER_SEED = String(seedParsed);
      try {
        faker.seed(Number(seedParsed));
      } catch {
        /* ignore */
      }
    } else {
      delete process.env.FAKER_SEED; // ensure non-deterministic when seed omitted
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
      logger.error({ err }, "Generation failure");
      await reply.status(500).send({ error: "GENERATION_FAILED" });
    }
  },
);

app.get("/health", async () => ({ status: "ok" }));

async function start(): Promise<void> {
  const port = Number(process.env.PORT || 3002);
  try {
    await app.listen({ port, host: "0.0.0.0" });
    logger.info({ event: "listening", port }, "Generator HTTP listening");
  } catch (err) {
    logger.error({ err }, "Startup failure");
    process.exit(1);
  }
}

void start();
