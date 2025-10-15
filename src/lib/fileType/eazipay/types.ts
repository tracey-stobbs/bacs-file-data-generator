export type EaziPayTransactionCode = '01' | '17' | '18' | '99' | '0C' | '0N' | '0S';
export interface EaziPayRow {
  transactionCode: EaziPayTransactionCode;
  originatingSortCode: string;
  originatingAccountNumber: string;
  destinationSortCode: string;
  destinationAccountNumber: string;
  destinationAccountName: string;
  fixedZero: 0;
  amount: number;
  processingDate: string;
  empty: undefined;
  sunName: string;
  bacsReference: string;
  sunNumber: string;
}
import type { EaziPayDateFormat } from '../../utils/dateFormatter.js';
export interface EaziPayGeneratorOptions {
  dateFormat: EaziPayDateFormat;
  originating: { sortCode: string; accountNumber: string; accountName: string };
}
