import Fastify from "fastify";
import pino from "pino";
import { registerGenerateFileRoute } from "./http/routes/generateFileRoute.js";

const logger = pino({ level: process.env.DEBUG ? "debug" : "info" });
const app = Fastify({ logger: false });

registerGenerateFileRoute(app);

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

// Only auto-start if executed directly (ESM entry check)
const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) void start();

export { app, start };
