import type { DateTime } from 'luxon';
export type EaziPayDateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'YYYYMMDD';
export function pickRandomEaziPayFormat(): EaziPayDateFormat { const formats: EaziPayDateFormat[] = ['YYYY-MM-DD','DD/MM/YYYY','YYYYMMDD']; const idx = Math.floor(Math.random()*formats.length); return formats[idx] ?? 'YYYY-MM-DD'; }
export function formatEaziPayDate(dt: DateTime, format: EaziPayDateFormat): string { switch(format){ case 'YYYY-MM-DD': return dt.toFormat('yyyy-LL-dd'); case 'DD/MM/YYYY': return dt.toFormat('dd/LL/yyyy'); case 'YYYYMMDD': return dt.toFormat('yyyyLLdd'); } }
