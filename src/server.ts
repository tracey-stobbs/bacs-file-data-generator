import Fastify from 'fastify';
import pino from 'pino';
import { pathToFileURL } from 'url';
import { registerGenerateFileRoute } from './http/routes/generateFileRoute.js';

const logger = pino({ level: process.env.DEBUG ? 'debug' : 'info' });
// Adopt Fastify v5 loggerInstance pattern for unified logging
const app = Fastify({ loggerInstance: logger });

// Cast to any to bridge Fastify v5 logger type differences in generic signatures
registerGenerateFileRoute(app as any);

app.get(
  '/health',
  {
    schema: {
      response: {
        200: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] },
      },
    },
  },
  async () => ({ status: 'ok' })
);

async function start(): Promise<void> {
  const port = Number(process.env.PORT || 3002);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info({ event: 'listening', port }, 'Generator HTTP listening');
  } catch (err) {
    app.log.error({ err }, 'Startup failure');
    process.exit(1);
  }
}

// Autostart when executed directly (robust cross-platform: compare to file URL version of argv[1])
try {
  const directHref = pathToFileURL(process.argv[1]).href;
  const isDirect = import.meta.url === directHref;
  if (isDirect) {
    start().catch((err) => {
      app.log.error({ err }, 'Start failed');
      process.exit(1);
    });
  }
} catch {
  // Fallback to legacy heuristic (may fail on Windows but won't throw)
  if (import.meta.url === `file://${process.argv[1]}`) {
    start().catch((err) => {
      app.log.error({ err }, 'Start failed');
      process.exit(1);
    });
  }
}

export { app, start };
