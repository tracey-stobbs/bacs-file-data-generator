// Domain type definitions for generation & preview API (replaces legacy generic placeholders)
export type SupportedFileType = 'EaziPay';
export type CommonTransactionCode = '01' | '17' | '18' | '99' | '0C' | '0N' | '0S';

export interface BaseGenerationRequest {
    fileType: SupportedFileType;
    numberOfRows: number;
    hasInvalidRows?: boolean;
    sun?: string;
}

export interface OriginatingAccountDetails {
    sortCode?: string;
    accountNumber?: string;
    accountName?: string;
}

export interface EaziPayGenerationRequest extends BaseGenerationRequest {
    fileType: 'EaziPay';
    dateFormat?: string; // One of EaziPayDateFormat; kept string to avoid circular import here.
    originating?: OriginatingAccountDetails;
}

export type GenerationRequest = EaziPayGenerationRequest;

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