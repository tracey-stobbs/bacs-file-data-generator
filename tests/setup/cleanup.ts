import { beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";

const out = path.resolve(process.cwd(), "output");

async function removeOut(): Promise<void> {
  try {
    await fs.rm(out, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

beforeAll(async () => {
  await removeOut();
});
afterAll(async () => {
  await removeOut();
});
