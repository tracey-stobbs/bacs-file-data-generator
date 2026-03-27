import type { DateTime } from 'luxon';
import { faker } from '@faker-js/faker';
export type EaziPayDateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'YYYYMMDD';
export function pickRandomEaziPayFormat(): EaziPayDateFormat {
  const formats: EaziPayDateFormat[] = ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYYMMDD'];
  // Use faker's RNG so the selection is deterministic when faker.seed() is used.
  return faker.helpers.arrayElement(formats) ?? 'YYYY-MM-DD';
}
export function formatEaziPayDate(dt: DateTime, format: EaziPayDateFormat): string {
  switch (format) {
    case 'YYYY-MM-DD':
      return dt.toFormat('yyyy-LL-dd');
    case 'DD/MM/YYYY':
      return dt.toFormat('dd/LL/yyyy');
    case 'YYYYMMDD':
      return dt.toFormat('yyyyLLdd');
  }
}
