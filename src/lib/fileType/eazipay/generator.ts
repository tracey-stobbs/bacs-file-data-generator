import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { EaziPayValidator } from "../../validators/eazipayValidator.js";
import {
  formatEaziPayDate,
  pickRandomEaziPayFormat,
} from "../../utils/dateFormatter.js";
import { AddWorkingDays } from "../../utils/calendar.js";
import { generateFileWithFs } from "../../fileWriter/fileWriter.js";
import type { EaziPayRow } from "./types.js";
import type {
  EaziPayGenerationRequest,
  PreviewResult,
  PreviewRow,
  PreviewHeaderField,
} from "../../../types.js";
import type { FileSystem } from "../../utils/fsWrapper.js";
import type { EaziPayDateFormat } from "../../utils/dateFormatter.js";
function generatePaymentReference(): string {
  let ref = faker.string.alphanumeric(faker.number.int({ min: 7, max: 17 }));
  while (
    /^( |DDIC)/.test(ref) ||
    /^([A-Za-z0-9])\1+$/.test(ref) ||
    ref.length <= 6 ||
    ref.length >= 18
  ) {
    ref = faker.string.alphanumeric(faker.number.int({ min: 7, max: 17 }));
  }
  return ref;
}
function generateAmount(transactionCode: string): number {
  if (EaziPayValidator.isContraCode(transactionCode)) return 0;
  return faker.number.int({ min: 1, max: 999999 });
}
function generateProcessingDate(
  transactionCode: string,
  dateFormat: EaziPayDateFormat
): string {
  const today = DateTime.now();
  let targetDate: DateTime;
  if (EaziPayValidator.isContraCode(transactionCode)) {
    targetDate = AddWorkingDays(today, 2);
  } else {
    const workingDays = faker.number.int({ min: 2, max: 30 });
    targetDate = AddWorkingDays(today, workingDays);
  }
  return formatEaziPayDate(targetDate, dateFormat);
}
function generateSunNumber(transactionCode: string): string {
  if (!EaziPayValidator.isSunNumberAllowed(transactionCode)) return "";
  if (faker.datatype.boolean()) {
    return faker.string.alphanumeric(faker.number.int({ min: 5, max: 10 }));
  }
  return "";
}
function generateInvalidFieldValue(
  fieldName: string,
  transactionCode: string
): string | number {
  switch (fieldName) {
    case "transactionCode":
      return faker.helpers.arrayElement(["XX", "INVALID", "00"]);
    case "originatingSortCode":
    case "destinationSortCode":
      return faker.string.alpha({ length: 6 });
    case "originatingAccountNumber":
    case "destinationAccountNumber":
      return faker.string.alpha({ length: 8 });
    case "destinationAccountName":
      return faker.string.alpha({ length: 25 });
    case "bacsReference":
      return "DDIC" + faker.string.alphanumeric(5);
    case "amount":
      return -999;
    case "fixedZero":
      return faker.number.int({ min: 1, max: 10 });
    case "sunNumber":
      if (!EaziPayValidator.isSunNumberAllowed(transactionCode)) {
        return faker.string.alphanumeric(5);
      }
      return faker.string.alpha({ length: 50 });
    default:
      return "INVALID";
  }
}
export function generateValidEaziPayRow(
  req: {
    originating?: {
      sortCode?: string;
      accountNumber?: string;
      accountName?: string;
    };
  },
  dateFormat: EaziPayDateFormat
): EaziPayRow {
  const transactionCode = faker.helpers.arrayElement(
    EaziPayValidator.allowedTransactionCodes as readonly string[]
  ) as EaziPayRow["transactionCode"];
  return {
    transactionCode,
    originatingSortCode:
      req.originating?.sortCode ?? faker.finance.routingNumber().slice(0, 6),
    originatingAccountNumber:
      req.originating?.accountNumber ?? faker.finance.accountNumber(8),
    destinationSortCode: faker.finance.routingNumber().slice(0, 6),
    destinationAccountNumber: faker.finance.accountNumber(8),
    destinationAccountName: faker.company.name().slice(0, 18),
    fixedZero: 0,
    amount: generateAmount(transactionCode),
    processingDate: generateProcessingDate(transactionCode, dateFormat),
    empty: undefined,
    sunName: faker.company.name().slice(0, 18),
    bacsReference: generatePaymentReference(),
    sunNumber: generateSunNumber(transactionCode),
  };
}
export function generateInvalidEaziPayRow(
  req: {
    originating?: {
      sortCode?: string;
      accountNumber?: string;
      accountName?: string;
    };
  },
  dateFormat: EaziPayDateFormat
): EaziPayRow {
  const base = generateValidEaziPayRow(req, dateFormat);
  const row: EaziPayRow = { ...base };
  const invalidatableFields: Array<
    | keyof EaziPayRow
    | "amount"
    | "fixedZero"
    | "sunNumber"
    | "transactionCode"
    | "destinationSortCode"
    | "destinationAccountNumber"
    | "destinationAccountName"
    | "bacsReference"
  > = [
    "transactionCode",
    "destinationSortCode",
    "destinationAccountNumber",
    "destinationAccountName",
    "bacsReference",
    "amount",
    "fixedZero",
    "sunNumber",
  ];
  const numInvalid = faker.number.int({ min: 1, max: 3 });
  const fieldsToInvalidate = faker.helpers
    .shuffle(invalidatableFields)
    .slice(0, numInvalid);
  // Ensure at least one of the commonly-detected invalid fields is included so
  // simple heuristic tests (sort code alphabetic / negative amount / txn 'XX')
  // reliably detect an invalid row.
  const detectionFields = [
    'transactionCode',
    'destinationSortCode',
    'amount',
  ];
  if (!fieldsToInvalidate.some((f) => detectionFields.includes(String(f)))) {
    // Prefer destinationSortCode since it's non-destructive elsewhere.
    fieldsToInvalidate.push('destinationSortCode');
  }
  for (const fieldName of fieldsToInvalidate) {
    switch (fieldName) {
      case "transactionCode":
        row.transactionCode = generateInvalidFieldValue(
          fieldName,
          row.transactionCode
        ) as EaziPayRow["transactionCode"];
        break;
      case "destinationSortCode":
        row.destinationSortCode = String(
          generateInvalidFieldValue(fieldName, row.transactionCode)
        );
        break;
      case "destinationAccountNumber":
        row.destinationAccountNumber = String(
          generateInvalidFieldValue(fieldName, row.transactionCode)
        );
        break;
      case "destinationAccountName":
        row.destinationAccountName = String(
          generateInvalidFieldValue(fieldName, row.transactionCode)
        ).slice(0, 18);
        break;
      case "bacsReference":
        row.bacsReference = String(
          generateInvalidFieldValue(fieldName, row.transactionCode)
        );
        break;
      case "amount":
        row.amount = Number(
          generateInvalidFieldValue(fieldName, row.transactionCode)
        );
        break;
      case "fixedZero":
        row.fixedZero = 0;
        break;
      case "sunNumber":
        row.sunNumber = String(
          generateInvalidFieldValue(fieldName, row.transactionCode)
        );
        break;
    }
  }
  return row;
}
export function formatEaziPayRowAsArray(fields: EaziPayRow): string[] {
  return [
    fields.transactionCode,
    fields.originatingSortCode,
    fields.originatingAccountNumber,
    fields.destinationSortCode,
    fields.destinationAccountNumber,
    fields.destinationAccountName,
    fields.fixedZero.toString(),
    fields.amount.toString(),
    fields.processingDate,
    fields.empty === undefined ? "" : String(fields.empty),
    fields.sunName,
    fields.bacsReference,
    fields.sunNumber ?? "",
    "",
  ];
}
export const toArray = formatEaziPayRowAsArray;
export const eaziPayAdapter = {
  buildPreviewRows(params: {
    numberOfRows?: number;
    dateFormat?: string;
    hasInvalidRows?: boolean;
    originating?: {
      sortCode?: string;
      accountNumber?: string;
      accountName?: string;
    };
    sun?: string;
  }): string[][] {
    const numberOfRows = params.numberOfRows ?? 15;
    const dateFormat: EaziPayDateFormat =
      (params.dateFormat as EaziPayDateFormat | undefined) ||
      pickRandomEaziPayFormat();
    const rows: string[][] = [];
    const invalidRows = params.hasInvalidRows
      ? Math.min(numberOfRows - 1, Math.ceil((numberOfRows - 1) / 2))
      : 0;
    const internalReq = { originating: params.originating };
    for (let i = 0; i < numberOfRows; i++) {
      const shouldBeInvalid =
        params.hasInvalidRows && invalidRows > 0 && i >= 1 && i <= invalidRows;
      const rowData = shouldBeInvalid
        ? generateInvalidEaziPayRow(internalReq, dateFormat)
        : generateValidEaziPayRow(internalReq, dateFormat);
      rows.push(formatEaziPayRowAsArray(rowData));
    }
    return rows;
  },
  serialize(rows: string[][]): string {
    return rows.map((r) => r.join(",")).join("\n");
  },
  previewMeta(
    rows: string[][],
    params: { hasInvalidRows?: boolean; sun?: string }
  ) {
    const validity: "I" | "V" = params.hasInvalidRows ? "I" : "V";
    return {
      rows: rows.length,
      columns: 14,
      header: "NH",
      validity,
      fileType: "EaziPay" as const,
      sun: params.sun,
    };
  },
  buildRow(params: {
    validity?: "invalid" | "valid";
    dateFormat?: string;
    originating?: {
      sortCode?: string;
      accountNumber?: string;
      accountName?: string;
    };
  }) {
    const req = {
      originating: {
        sortCode: params.originating?.sortCode,
        accountNumber: params.originating?.accountNumber,
        accountName: params.originating?.accountName,
      },
    };
    const effectiveFormat =
      (params.dateFormat as EaziPayDateFormat | undefined) ?? "YYYY-MM-DD";
    const data =
      params.validity === "invalid"
        ? generateInvalidEaziPayRow(req, effectiveFormat)
        : generateValidEaziPayRow(req, effectiveFormat);
    const fields = formatEaziPayRowAsArray(data);
    return { row: { fields, asLine: fields.join(",") } };
  },
  parse(content: string) {
    const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
    const rows = lines.map((line, i) => ({
      index: i,
      asLine: line,
      fields: line.split(","),
    }));
    return { rows };
  },
} as const;
export async function generateFile(req: {
  numberOfRows?: number;
  dateFormat?: string;
  hasInvalidRows?: boolean;
  originating?: {
    sortCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
  sun?: string;
}): Promise<{ filePath: string; fileContent: string }> {
  const rows = eaziPayAdapter.buildPreviewRows(req);
  const serialized = eaziPayAdapter.serialize(rows);
  const wrapper = {
    rows,
    serialize: () => serialized,
    fileContent: serialized,
    numberOfRows: req.numberOfRows ?? rows.length,
    hasInvalidRows: req.hasInvalidRows,
  };
  const fsMod: { nodeFs: FileSystem } = await import(
    "../../utils/fsWrapper.js"
  );
  return generateFileWithFs(wrapper, fsMod.nodeFs, req.sun || "DEFAULT");
}
export function previewRows(
  req: EaziPayGenerationRequest,
  _invalid: boolean
): PreviewResult {
  // touch the second param so lint doesn't complain while keeping signature consistent with other generators
  void _invalid;
  const rows2D: string[][] = eaziPayAdapter.buildPreviewRows(req);
  const headers: PreviewHeaderField[] = [
    "Transaction Code",
    "Originating Sort Code",
    "Originating Account Number",
    "Destination Sort Code",
    "Destination Account Number",
    "Destination Account Name",
    "Fixed Zero",
    "Amount",
    "Processing Date",
    "Empty",
    "SUN Name",
    "Payment Reference",
    "SUN Number",
    "Empty Trailer 1",
  ].map((h, i) => ({ name: h, value: i }));
  const previewRowsMapped: PreviewRow[] = rows2D.map((r) => ({
    fields: r.map((v, i) => ({ value: v, order: i })),
  }));
  return {
    headers,
    rows: previewRowsMapped,
    metadata: eaziPayAdapter.previewMeta(rows2D, {
      hasInvalidRows: req.hasInvalidRows,
      sun: req.sun,
    }),
  };
}

/**
 * Generate EaziPay rows with optional constraint on allowed transaction codes.
 * This is a higher-level helper so API layers don't need to replicate filtering logic.
 * If a faker seed (FAKER_SEED) is provided it seeds deterministically for repeatable outputs.
 */
export function generateEaziPayRowsConstrained(params: {
  numberOfRows?: number;
  allowedTransactionCodes?: string[];
  dateFormat?: string;
  originating?: { sortCode?: string; accountNumber?: string; accountName?: string };
}): string[][] {
  const seed = process.env.FAKER_SEED;
  if (seed) {
    try { faker.seed(Number(seed)); } catch { /* ignore */ }
  }
  const dateFormat: EaziPayDateFormat = (params.dateFormat as EaziPayDateFormat | undefined) || 'YYYY-MM-DD';
  const rows: string[][] = [];
  const count = params.numberOfRows ?? 10;
  const allowed = params.allowedTransactionCodes && params.allowedTransactionCodes.length > 0
    ? params.allowedTransactionCodes
    : (EaziPayValidator.allowedTransactionCodes as readonly string[]);
  const req = { originating: params.originating };
  for (let i = 0; i < count; i++) {
    const rowObj = generateValidEaziPayRow(req, dateFormat);
    if (!allowed.includes(rowObj.transactionCode)) {
      // Deterministic pick based on index to keep distribution stable across seeds
      (rowObj as any).transactionCode = allowed[i % allowed.length];
      if (['0C','0N','0S'].includes(rowObj.transactionCode)) (rowObj as any).amount = 0;
    }
    rows.push(formatEaziPayRowAsArray(rowObj));
  }
  return rows;
}

/**
 * Version of generateEaziPayRowsConstrained that returns the rows plus
 * metadata describing which originating/client values were used so callers
 * (for example bacs-report-api) can persist that in the output metadata
 * and pass it to the XML generator.
 */
export function generateEaziPayRowsConstrainedWithMeta(params: {
  numberOfRows?: number;
  allowedTransactionCodes?: string[];
  dateFormat?: string;
  originating?: { sortCode?: string; accountNumber?: string; accountName?: string; sunNumber?: string; sunName?: string; clientName?: string; email?: string; prefix?: string; shortName?: string };
}) {
  const rows = generateEaziPayRowsConstrained(params as any);
  const originating = params?.originating || {};
  // Normalize metadata keys we want to record
  const meta = {
    clientName: originating.clientName ?? null,
    originating: {
      sortCode: originating.sortCode ?? null,
      accountNumber: originating.accountNumber ?? null,
      accountName: originating.accountName ?? null,
      sunNumber: originating.sunNumber ?? null,
      sunName: originating.sunName ?? null,
      email: originating.email ?? null,
      prefix: originating.prefix ?? null,
      shortName: originating.shortName ?? null,
    },
  };
  return { rows, metadata: meta };
}
