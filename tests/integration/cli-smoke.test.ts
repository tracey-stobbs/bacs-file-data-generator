import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Simple smoke test: run the CLI with a known seed and verify output file is created
describe('CLI integration smoke', () => {
  const outRoot = path.resolve(__dirname, '../../output/test-cli-smoke');

  beforeAll(() => {
    // Ensure clean
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
    process.env.OUTPUT_ROOT = outRoot;
  });

  beforeAll(() => {
    // Build the project so we can spawn the compiled JS with a regular node process.
    // This avoids ts-node/ESM loader compatibility issues when spawning child processes.
    try {
      execSync('npm run build', {
        cwd: path.resolve(__dirname, '../../'),
        stdio: 'inherit',
      });
    } catch (err) {
      // If build fails, let the test fail later when running the CLI
      // but print the error for debugging.
      // eslint-disable-next-line no-console
      console.error('Build failed in beforeAll:', err);
    }
  });

  afterAll(() => {
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
  });

  it('generates deterministically with faker seed', () => {
    // Run CLI in a spawned process using the ts-node ESM loader so we test the actual CLI process path
    // Spawn the compiled CLI (dist) with node to avoid loader/ts-node issues.
    execSync(
      'node dist/cli/generate.js --fileType=EaziPay --rows=5 --faker-seed=1234 --outputRoot=' +
        outRoot,
      {
        cwd: path.resolve(__dirname, '../../'),
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '0' },
      }
    );

    // Verify output folder exists and contains at least one file
    const files = fs.readdirSync(outRoot, { withFileTypes: true });
    expect(files.length).toBeGreaterThan(0);
  }, 20000);
});
