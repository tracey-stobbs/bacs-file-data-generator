export interface Logger { info(msg: unknown, meta?: unknown): void; error(msg: unknown, meta?: unknown): void; debug(msg: unknown, meta?: unknown): void; }
class ConsoleLogger implements Logger { info(msg: unknown): void { console.log('[info]', msg); } error(msg: unknown): void { console.error('[error]', msg); } debug(msg: unknown): void { if (process.env.DEBUG) console.debug('[debug]', msg); } }
export const logger: Logger = new ConsoleLogger();
