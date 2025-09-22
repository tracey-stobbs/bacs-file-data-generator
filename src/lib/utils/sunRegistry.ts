export interface SunRecord { sun: string; sortCode: string; accountNumber: string; accountName: string; }
const demo: SunRecord[] = [ { sun: 'DEFAULT', sortCode: '123456', accountNumber: '12345678', accountName: 'DEFAULT CO' } ];
export function findSun(sun: string): SunRecord { return demo.find(r => r.sun === sun) ?? demo[0]; }
