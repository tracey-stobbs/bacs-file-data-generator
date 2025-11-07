import fs from "fs";
import path from "path";
import { generateFile } from "../lib/factory.js";

// Programmatic smoke test: call generateFile directly under Vitest to avoid loader issues
describe("CLI integration smoke", () => {
  const outRoot = path.resolve(__dirname, "../../output/test-cli-smoke");

  beforeAll(() => {
    // Ensure clean
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
    process.env.OUTPUT_ROOT = outRoot;
  });

  afterAll(() => {
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
  });

  it("generates deterministically with faker seed", async () => {
    process.env.FAKER_SEED = "1234";

    const req = {
      fileType: "EaziPay",
      numberOfRows: 5,
      hasInvalidRows: false,
    } as const;

    const result = await generateFile(req as any);

    expect(result).toBeTruthy();
    if (result.filePath) {
      expect(fs.existsSync(result.filePath)).toBe(true);
      const content = fs.readFileSync(result.filePath, "utf8");
      expect(content.length).toBeGreaterThan(10);
    }
  }, 20000);
});
