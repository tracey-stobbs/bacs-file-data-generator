// Environment-based SUN configuration loader for multi-client Bacs18PaymentLines generation

export interface SunConfig {
  sunNumber: string;
  sunName: string;
  sortCode: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
}

/**
 * Loads SUN configurations from environment variables.
 * Expects SUN_N_SUN_NUMBER, SUN_N_SUN_NAME, SUN_N_SORT_CODE, SUN_N_ACCOUNT_NUMBER, SUN_N_ACCOUNT_NAME, SUN_N_BANK_NAME format.
 * Stops when SUN_N_* is missing (gaps indicate end of sequence).
 *
 * @returns Array of SUN configurations, empty if none found
 * @throws Error if SUN has incomplete data (missing required fields)
 *
 * @example
 * // .env file:
 * // SUN_1_SUN_NUMBER=510001
 * // SUN_1_SUN_NAME=TMS FM
 * // SUN_1_SORT_CODE=106057
 * // SUN_1_ACCOUNT_NUMBER=99128289
 * // SUN_1_ACCOUNT_NAME=Holder-GO2
 * // SUN_1_BANK_NAME=Bank-WP5A
 *
 * const suns = loadSunsFromEnv();
 * // Returns: [{ sunNumber: '510001', sunName: 'TMS FM', sortCode: '106057', ... }, ...]
 */
export function loadSunsFromEnv(): SunConfig[] {
  const suns: SunConfig[] = [];
  let sunIndex = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const sunNumberKey = `SUN_${sunIndex}_SUN_NUMBER`;
    const sunNameKey = `SUN_${sunIndex}_SUN_NAME`;
    const sortCodeKey = `SUN_${sunIndex}_SORT_CODE`;
    const accountNumberKey = `SUN_${sunIndex}_ACCOUNT_NUMBER`;
    const accountNameKey = `SUN_${sunIndex}_ACCOUNT_NAME`;
    const bankNameKey = `SUN_${sunIndex}_BANK_NAME`;

    const sunNumber = process.env[sunNumberKey];
    const sunName = process.env[sunNameKey];
    const sortCode = process.env[sortCodeKey];
    const accountNumber = process.env[accountNumberKey];
    const accountName = process.env[accountNameKey];
    const bankName = process.env[bankNameKey];

    // If first field is missing, assume we've reached the end
    if (!sunNumber) {
      break;
    }

    // Validate all required fields are present for this SUN
    if (!sunName || !sortCode || !accountNumber || !accountName || !bankName) {
      const missingFields = [];
      if (!sunName) missingFields.push(sunNameKey);
      if (!sortCode) missingFields.push(sortCodeKey);
      if (!accountNumber) missingFields.push(accountNumberKey);
      if (!accountName) missingFields.push(accountNameKey);
      if (!bankName) missingFields.push(bankNameKey);

      throw new Error(
        `Incomplete SUN configuration for SUN_${sunIndex}: Missing ${missingFields.join(', ')}`
      );
    }

    suns.push({
      sunNumber: sunNumber.trim(),
      sunName: sunName.trim(),
      sortCode: sortCode.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      bankName: bankName.trim(),
    });

    sunIndex++;
  }

  return suns;
}
