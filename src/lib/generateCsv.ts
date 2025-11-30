import { generateEaziPayRowsConstrainedWithMeta } from "./fileType/eazipay/index.js";
import { csvQuote } from "./utils/csv/csvUtils.js";
import { ensureSeeded } from "./utils/seed.js";
import type { OriginatingAccountDetails } from "../types.js";

export interface GenerateCsvOptions {
  reportType: "eazipay"; // future: extend to other types
  numberOfRows?: number;
  allowedTransactionCodes?: string[];
  dateFormat?: string;
  originating?: {
    sortCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

export function generateCsv(options: GenerateCsvOptions): {
  rows: string[][];
  csv: string;
} {
  // Ensure deterministic seed is applied before any faker usage during generation
  ensureSeeded();
  type Row = string[];
  switch (options.reportType) {
    case "eazipay": {
      type OriginatingWithSun = OriginatingAccountDetails & {
        sunName?: string;
      };
      const originating: OriginatingWithSun =
        (options.originating as OriginatingWithSun | undefined) || {};
      if (!originating.sunName) originating.sunName = "Local Generated";
      const result = generateEaziPayRowsConstrainedWithMeta({
        numberOfRows: options.numberOfRows,
        // Generator requires a non-empty array; default to validator's allowed set when not provided.
        allowedTransactionCodes:
          (options.allowedTransactionCodes && options.allowedTransactionCodes.length > 0)
            ? options.allowedTransactionCodes
            : ["01", "17", "18", "0C", "0N", "0S", "99"],
        dateFormat: options.dateFormat,
        originating,
      });
      const csv = (result.rows as string[][])
        .map((r: string[]) => csvQuote(r))
        .join("\n");
      const rows: Row[] = result.rows as string[][];
      return { rows, csv } as {
        rows: string[][];
        csv: string;
      };
    }
    default:
      throw new Error(`Unsupported report type: ${options.reportType}`);
  }
}
