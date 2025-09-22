export function computeInvalidRowsCap(numberOfRows: number, forInlineEditing?: boolean): number { if (numberOfRows <= 1) return 0; const cap = Math.ceil((numberOfRows - 1) / 2); return forInlineEditing ? Math.min(cap, 10) : cap; }
export function toCsvLine(fields: string[]): string { return fields.join(','); }
