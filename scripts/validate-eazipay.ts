import fs from "fs";
import path from "path";
import { EaziPayValidator } from "../src/lib/validators/eazipayValidator.js";

function readCsv(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .filter((l: string) => l.trim().length > 0)
    .map((l: string) => l.split(","));
}

function validateRows(rows: string[][]): string[] {
  const errors: string[] = [];
  const expectedCols = EaziPayValidator.getColumnCount();
  rows.forEach((cols: string[], i: number) => {
    if (cols.length !== expectedCols)
      errors.push(
        `Row ${i} has ${cols.length} cols (expected ${expectedCols})`,
      );
    const txn = cols[0];
    if (!EaziPayValidator.isTransactionCode(txn))
      errors.push(`Row ${i} invalid transaction code: "${txn}"`);
    const sunCol = cols[12] ?? "";
    // If txn allows SUN, sunCol may be present or empty; if txn doesn't allow SUN, sunCol must be empty
    const allowsSun = EaziPayValidator.isSunNumberAllowed(txn);
    if (!allowsSun && sunCol && sunCol.trim() !== "") {
      errors.push(
        `Row ${i} has SUN value but transaction ${txn} does not allow SUN: "${sunCol}"`,
      );
    }
  });
  return errors;
}

void (async function main(): Promise<void> {
  const generatedPath = path.join("output", "EaziPay", "DEFAULT");
  const files = fs.existsSync(generatedPath)
    ? fs.readdirSync(generatedPath)
    : [];
  if (!files || files.length === 0) {
    console.error("No generated files found in", generatedPath);
    process.exit(2);
  }
  // pick most recent by name
  files.sort();
  const fileName = files[files.length - 1];
  const fullPath = path.join(generatedPath, fileName);
  console.log("Validating", fullPath);
  const rows = readCsv(fullPath);
  console.log("Rows read:", rows.length);
  const errors = validateRows(rows);
  if (errors.length === 0) {
    console.log("Validation PASS — no issues found");
    process.exit(0);
  }
  console.error("Validation FAIL — issues:");
  for (const e of errors) console.error(" -", e);
  process.exit(3);
})();
