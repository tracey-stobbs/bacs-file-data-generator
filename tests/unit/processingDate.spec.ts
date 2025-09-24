import { describe, it, expect, vi, afterEach } from 'vitest';
import { DateTime } from 'luxon';
import { generateProcessingDate } from '../../src/lib/fileType/eazipay/generator.js';
import { AddWorkingDays } from '../../src/lib/utils/calendar.js';

describe('generateProcessingDate contra rules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('before 4pm: contra codes use next working day', () => {
    // Mock now to 2025-09-24T15:00 (3pm)
  vi.spyOn(DateTime, 'now').mockImplementation(() => DateTime.fromISO('2025-09-24T15:00:00') as any);
    const result = generateProcessingDate('0N', 'YYYY-MM-DD');
    const expected = AddWorkingDays(DateTime.fromISO('2025-09-24'), 1).toISODate();
    expect(result).toBe(expected);
  });

  it('at or after 4pm: contra codes use two working days', () => {
  vi.spyOn(DateTime, 'now').mockImplementation(() => DateTime.fromISO('2025-09-24T16:00:00') as any);
    const result = generateProcessingDate('0C', 'YYYY-MM-DD');
    const expected = AddWorkingDays(DateTime.fromISO('2025-09-24'), 2).toISODate();
    expect(result).toBe(expected);
  });
});
