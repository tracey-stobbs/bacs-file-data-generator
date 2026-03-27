// Domain type definitions for generation & preview API (replaces legacy generic placeholders)
export type SupportedFileType = 'EaziPay' | 'SDDirect' | 'Bacs18PaymentLines';
export type CommonTransactionCode = '01' | '17' | '18' | '99' | '0C' | '0N' | '0S';

export interface BaseGenerationRequest {
  fileType: SupportedFileType;
  numberOfRows: number;
  hasInvalidRows?: boolean;
  sun?: string;
  clientIdentifier?: string; // Optional client identifier for multi-client file naming
}

export interface OriginatingAccountDetails {
  sortCode?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface EaziPayGenerationRequest extends BaseGenerationRequest {
  fileType: 'EaziPay';
  dateFormat?: string; // One of EaziPayDateFormat; kept string to avoid circular import here.
  allowedTransactionCodes?: string[]; // Filter rows to only these transaction codes
  originating?: OriginatingAccountDetails;
  processingDate?: string; // ISO date string (YYYY-MM-DD) to override processing date for all rows
}

export interface SDDirectGenerationRequest extends BaseGenerationRequest {
  fileType: 'SDDirect';
  originating?: OriginatingAccountDetails;
  includeOptionalFields?: boolean;
}

export interface Bacs18GenerationRequest extends BaseGenerationRequest {
  fileType: 'Bacs18PaymentLines';
  bacs18Type?: 'DAILY' | 'MULTI';
  originating?: OriginatingAccountDetails; // Optional - falls back to faker-generated values
}

export type GenerationRequest =
  | EaziPayGenerationRequest
  | SDDirectGenerationRequest
  | Bacs18GenerationRequest;

export interface GeneratedFileResult {
  filePath: string;
  fileContent: string;
}

export interface PreviewHeaderField {
  name: string;
  value: number;
}

export interface PreviewFieldValue {
  value: string;
  order: number;
}

export interface PreviewRow {
  fields: PreviewFieldValue[];
}

export interface PreviewMetadata {
  fileType: SupportedFileType;
  rows?: number;
  columns?: number;
  header?: string; // e.g. NH/H
  validity?: 'I' | 'V';
  sun?: string;
}

export interface PreviewResult {
  headers: PreviewHeaderField[];
  rows: PreviewRow[];
  metadata: PreviewMetadata;
}

export interface RowBuildResult {
  row: { fields: string[]; asLine: string };
}

export interface AdapterInterface<TReq extends BaseGenerationRequest = BaseGenerationRequest> {
  buildPreviewRows(req: TReq): string[][];
  serialize(rows: string[][]): string;
  previewMeta(rows: string[][], req: TReq): PreviewMetadata;
}

// Types for API adapter interop (used by bacs-report-api)
export type GeneratorParams = {
  numberOfRows: number;
  allowedTransactionCodes: string[];
  includeSunNumber: boolean;
  originating: {
    sortCode: string;
    accountNumber: string;
    accountName: string;
    sunNumber?: string;
    sunName?: string;
    clientName?: string;
    email?: string;
    prefix?: string;
    shortName?: string;
  };
  dateFormat: string;
  processingDate?: string;
};

export type GeneratorResult = {
  rows: string[][];
  metadata?: { originating?: Record<string, unknown>; [k: string]: unknown };
};
