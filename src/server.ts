import Fastify from "fastify";
import pino from "pino";
import { registerGenerateFileRoute } from "./http/routes/generateFileRoute.js";

const logger = pino({ level: process.env.DEBUG ? "debug" : "info" });
// Adopt Fastify v5 loggerInstance pattern for unified logging
const app = Fastify({ loggerInstance: logger });

// Cast to any to bridge Fastify v5 logger type differences in generic signatures
registerGenerateFileRoute(app as any);

app.get("/health", { schema: { response: { 200: { type: "object", properties: { status: { type: "string" } }, required: ["status"] } } } }, async () => ({ status: "ok" }));

async function start(): Promise<void> {
  const port = Number(process.env.PORT || 3002);
  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info({ event: "listening", port }, "Generator HTTP listening");
  } catch (err) {
    app.log.error({ err }, "Startup failure");
    process.exit(1);
  }
}

// Only auto-start if executed directly (ESM entry check)
const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) void start();

export { app, start };
