import { describe, it, expect } from 'vitest';
import { money, signedMoney, fmtR, tone, fromDate } from '../src/lib/format.js';

describe('format', () => {
  it('formats money with a real minus sign', () => {
    expect(money(1234.4)).toBe('$1,234');
    expect(money(-50)).toBe('−$50');
    expect(signedMoney(20)).toBe('+$20');
  });
  it('formats R multiples and picks a colour', () => {
    expect(fmtR(1.5)).toBe('+1.50R');
    expect(fmtR(-0.5)).toBe('−0.50R');
    expect(tone(-1)).toBe('down');
    expect(tone(0)).toBe('');
  });
  it('turns a range into a start date', () => {
    expect(fromDate('all')).toBeUndefined();
    expect(fromDate('30', new Date('2026-11-30T12:00:00Z'))).toBe('2026-10-31');
  });
});
