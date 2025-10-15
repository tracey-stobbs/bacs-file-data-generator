import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { EaziPayValidator } from "../../validators/eazipayValidator.js";
import {
  formatEaziPayDate,
  pickRandomEaziPayFormat,
} from "../../utils/dateFormatter.js";
import { AddWorkingDays } from "../../utils/calendar.js";
import { IsWorkingDay } from "../../utils/calendar.js";
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
export function generateProcessingDate(
  transactionCode: string,
  dateFormat: EaziPayDateFormat
): string {
  const now = DateTime.now();
  let today = now.startOf('day');
  let targetDate: DateTime;
  if (EaziPayValidator.isContraCode(transactionCode)) {
    // If generation time is before 16:00 local, contra processing date is next working day.
    // If at or after 16:00, contra processing date is two working days.
    const thresholdHour = 16; // 4pm
    const useDays = now.hour < thresholdHour ? 1 : 2;
    targetDate = AddWorkingDays(today, useDays);
    // Ensure contra processing date is not beyond 30 calendar days
    const maxDate = today.plus({ days: 30 });
    if (targetDate > maxDate) {
      // Move back to the latest working day on or before maxDate
      let candidate = maxDate;
      while (!IsWorkingDay(candidate)) {
        candidate = candidate.minus({ days: 1 });
      }
      targetDate = candidate;
    }
  } else {
    // Ensure working days is bounded to [2,30]
    let workingDays = faker.number.int({ min: 2, max: 30 });
    if (workingDays < 2) workingDays = 2;
    if (workingDays > 30) workingDays = 30;
    targetDate = AddWorkingDays(today, workingDays);
    // Ensure the chosen processing date is no more than 30 calendar days from today.
    const maxDate = today.plus({ days: 30 });
    if (targetDate > maxDate) {
      // If it falls beyond the calendar limit, move back to the latest working day on or before maxDate
      let candidate = maxDate;
      while (!IsWorkingDay(candidate)) {
        candidate = candidate.minus({ days: 1 });
      }
      targetDate = candidate;
    }
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
      processingDate?: string | null;
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
  destinationAccountName: sanitizeAccountName(faker.company.name()).slice(0, 18),
    fixedZero: 0,
    amount: generateAmount(transactionCode),
  processingDate: req.originating?.processingDate ?? generateProcessingDate(transactionCode, dateFormat),
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
      processingDate?: string | null;
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
          row.destinationAccountName = sanitizeAccountName(String(
            generateInvalidFieldValue(fieldName, row.transactionCode)
          )).slice(0, 18);
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
export function sanitizeAccountName(name: string): string {
  if (!name) return '';
  // Strip non-printable or non-ASCII characters. Keep printable ASCII range (0x20 - 0x7E).
  // Also remove double quotes and commas which can break downstream CSV parsing.
  const cleaned = name
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[",]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
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
  originating?: { sortCode?: string; accountNumber?: string; accountName?: string; sunNumber?: string; sunName?: string };
  includeSunNumber?: boolean;
  processingDate?: string;
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
  // SUN Name is required for EaziPay generation. Fail fast if it's not supplied.
  // Ensure we have a sunName for internal generation. Callers are encouraged to supply one;
  // however some programmatic callers (eg tests) may omit it — provide a sensible default.
  params.originating = params.originating ?? ({} as any);
  const originatingRef = params.originating as any;
  if (!originatingRef.sunName || String(originatingRef.sunName).trim() === '') {
    originatingRef.sunName = 'Local Generated';
  }
  // First, generate rows normally
  for (let i = 0; i < count; i++) {
    // If a fixed processingDate is supplied, ensure the generator uses it
    if (params.processingDate) {
      req.originating = req.originating ?? {};
      (req.originating as any).processingDate = params.processingDate;
    }
    const rowObj = generateValidEaziPayRow(req, dateFormat);
    if (!allowed.includes(rowObj.transactionCode)) {
      // Deterministic pick based on index to keep distribution stable across seeds
      (rowObj as any).transactionCode = allowed[i % allowed.length];
      // Recalculate amount and processingDate based on the final transaction code
      (rowObj as any).amount = generateAmount((rowObj as any).transactionCode);
      // Only recalculate processingDate when no explicit fixed processingDate was requested.
      if (!(params && (params as any).processingDate)) {
        (rowObj as any).processingDate = generateProcessingDate((rowObj as any).transactionCode, dateFormat);
      }
    }
    rows.push(formatEaziPayRowAsArray(rowObj));
  }

  // Prefer an explicitly-supplied SUN number. If provided, use it for every row.
  // If not provided, ensure the SUN column is empty in every row.
  // Handle optional population of the SUN Number column per-row when requested.
  // Note: API callers must not request SUN number population (they'll call with includeSunNumber=false).
  const includeSun = !!params.includeSunNumber;
  const suppliedSunName = params.originating?.sunName ? String(params.originating.sunName).slice(0, 18) : "";
  const suppliedSunNumberExact = params.originating?.sunNumber ? String(params.originating.sunNumber).trim() : null;
  for (let i = 0; i < rows.length; i++) {
    const tcode = String(rows[i][0]);
    // SUN Name: always use originating.sunName (required) for column 11
    if (suppliedSunName && suppliedSunName !== "") {
      rows[i][10] = suppliedSunName;
    }
    // SUN Number: populate only if includeSun is true and transaction code allows it
    if (includeSun) {
      if (suppliedSunNumberExact && suppliedSunNumberExact !== "") {
        // only populate exact supplied number when the transaction code allows a SUN
        rows[i][12] = EaziPayValidator.isSunNumberAllowed(tcode) ? suppliedSunNumberExact : "";
      } else {
        rows[i][12] = generateSunNumber(tcode);
      }
    } else {
      rows[i][12] = "";
    }
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
  processingDate?: string;
}) {
  const rows = generateEaziPayRowsConstrained(params as any);
  const originating = params?.originating || {};
  // Determine the actual SUN used. Prefer the explicitly supplied originating.sunNumber
  // if present, otherwise check rows (but rows will have been normalized above to
  // either contain the supplied SUN everywhere or be empty everywhere).
  const suppliedSun = params?.originating?.sunNumber ? String(params.originating.sunNumber).trim() : null;
  const suppliedSunName = params?.originating?.sunName ? String(params.originating.sunName).slice(0, 18) : null;
  const actualSun = suppliedSun && suppliedSun !== "" ? suppliedSun : (rows && rows.length > 0 && rows[0][12] && String(rows[0][12]).trim() !== "" ? String(rows[0][12]) : null);
  const actualSunName = suppliedSunName && suppliedSunName !== "" ? suppliedSunName : (rows && rows.length > 0 && rows[0][10] && String(rows[0][10]).trim() !== "" ? String(rows[0][10]) : null);
  // Normalize metadata keys we want to record
  const meta = {
    clientName: originating.clientName ?? null,
    originating: {
      sortCode: originating.sortCode ?? null,
      accountNumber: originating.accountNumber ?? null,
      accountName: originating.accountName ?? null,
  sunNumber: actualSun ?? (originating.sunNumber ?? null),
  sunName: actualSunName ?? (originating.sunName ?? null),
      email: originating.email ?? null,
      prefix: originating.prefix ?? null,
      shortName: originating.shortName ?? null,
      processingDate: params.processingDate ?? null,
    },
  };
  return { rows, metadata: meta };
}
