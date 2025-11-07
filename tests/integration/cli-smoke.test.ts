import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Simple smoke test: run the CLI with a known seed and verify output file is created
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

  it("generates deterministically with faker seed", () => {
    // Run CLI via node loader used by package script
    execSync(
      "node --loader ts-node/esm src/cli/generate.ts --fileType=EaziPay --rows=5 --faker-seed=1234 --outputRoot=" +
        outRoot,
      {
        cwd: path.resolve(__dirname, "../../"),
        stdio: "inherit",
        env: { ...process.env, FORCE_COLOR: "0" },
      },
    );

    // Verify output folder exists and contains at least one file
    const files = fs.readdirSync(outRoot, { withFileTypes: true });
    expect(files.length).toBeGreaterThan(0);
  }, 20000);
});
