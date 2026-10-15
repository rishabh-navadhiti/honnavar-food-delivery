import { describe, expect, it } from 'vitest';
import { formatDayTime, formatPrice, formatTime, formatWeekday } from './format';

const ist = (local: string) => new Date(`${local}:00+05:30`);
const KANNADA_DIGITS = /[೦-೯]/;

describe('formatPrice', () => {
  it('uses the rupee symbol, Indian grouping and Latin digits in both languages', () => {
    expect(formatPrice(1250, 'en')).toBe('₹1,250');
    expect(formatPrice(1250, 'kn')).toBe('₹1,250');
    expect(formatPrice(125000, 'en')).toBe('₹1,25,000');
    expect(formatPrice(125000, 'kn')).not.toMatch(KANNADA_DIGITS);
  });
});

describe('formatTime', () => {
  it('formats English times with lowercase am/pm', () => {
    expect(formatTime(ist('2026-10-12T13:30'), 'en')).toBe('1:30 pm');
    expect(formatTime(ist('2026-10-12T07:00'), 'en')).toBe('7:00 am');
  });

  it('formats Kannada times with the day-period word first and no Latin AM/PM', () => {
    expect(formatTime(ist('2026-10-12T13:30'), 'kn')).toBe('ಮಧ್ಯಾಹ್ನ 1:30');
    expect(formatTime(ist('2026-10-12T07:00'), 'kn')).toBe('ಬೆಳಗ್ಗೆ 7:00');
    expect(formatTime(ist('2026-10-12T18:30'), 'kn')).toBe('ಸಂಜೆ 6:30');
    expect(formatTime(ist('2026-10-12T21:00'), 'kn')).toBe('ರಾತ್ರಿ 9:00');
    for (const t of ['00:30', '07:00', '12:00', '18:30', '23:59']) {
      const out = formatTime(ist(`2026-10-12T${t}`), 'kn');
      expect(out).not.toMatch(/AM|PM|am|pm/);
      expect(out).not.toMatch(KANNADA_DIGITS);
    }
  });
});

describe('formatWeekday', () => {
  it('names ISO weekdays in each language', () => {
    expect(formatWeekday(1, 'kn')).toBe('ಸೋಮವಾರ');
    expect(formatWeekday(1, 'en')).toBe('Monday');
    expect(formatWeekday(7, 'en')).toBe('Sunday');
  });
});

describe('formatDayTime', () => {
  it('formats a date and time without Kannada digits', () => {
    expect(formatDayTime(ist('2026-10-12T13:30'), 'en')).toBe('12 Oct, 1:30 pm');
    expect(formatDayTime(ist('2026-10-12T13:30'), 'kn')).not.toMatch(KANNADA_DIGITS);
    expect(formatDayTime(ist('2026-10-12T13:30'), 'kn')).toContain('ಮಧ್ಯಾಹ್ನ 1:30');
  });
});
