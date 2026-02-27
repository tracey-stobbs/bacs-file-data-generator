// Bacs18PaymentLines types

export type Bacs18Type = 'DAILY' | 'MULTI';

export interface Bacs18OriginatingAccount {
  sortCode: string;
  accountNumber: string;
  accountName: string;
}

export interface Bacs18Row {
  destinationSortCode: string;
  destinationAccountNumber: string;
  fixedZero: string;
  transactionCode: string;
  originatingSortCode: string;
  originatingAccountNumber: string;
  realtimeInformationChecksum: string;
  amountPence: string;
  originatingAccountName: string;
  paymentReference: string;
  destinationAccountName: string;
  processingDateJulian: string;
}
