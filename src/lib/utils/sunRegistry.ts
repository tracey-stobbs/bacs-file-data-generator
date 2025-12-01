export interface SunRecord {
  sun: number;
  sortCode: string;
  accountNumber: string;
  accountName: string;
}
const demo: SunRecord[] = [
  {
    sun: 797154,
    sortCode: '912291',
    accountNumber: '51491194',
    accountName: 'ClientA-ikhWQO',
  },
];
export function findSun(sun: number): SunRecord {
  return demo.find((r) => r.sun === sun) ?? demo[0];
}
