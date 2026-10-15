import { describe, expect, it } from 'vitest';
import { emptyWeek, toHHMM, toMinutes, validateWeekHours, type WeekHours } from './hours';

describe('time conversion', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('07:30')).toBe(450);
    expect(toMinutes('24:00')).toBe(1440);
    expect(toHHMM(450)).toBe('07:30');
    expect(toHHMM(1440)).toBe('24:00');
  });

  it('rejects malformed times', () => {
    expect(toMinutes('7:30')).toBeNull();
    expect(toMinutes('24:30')).toBeNull();
    expect(toMinutes('12:60')).toBeNull();
    expect(toMinutes('ab:cd')).toBeNull();
  });
});

describe('validateWeekHours', () => {
  const week = (monday: WeekHours[1]): WeekHours => ({ ...emptyWeek(), 1: monday });

  it('accepts an empty week and empty days', () => {
    expect(validateWeekHours(emptyWeek())).toEqual({});
  });

  it('accepts two ordered, non-overlapping ranges', () => {
    expect(
      validateWeekHours(
        week([
          { opens: 660, closes: 900 },
          { opens: 1080, closes: 1440 },
        ]),
      ),
    ).toEqual({});
  });

  it('flags a range that ends before it starts', () => {
    expect(validateWeekHours(week([{ opens: 900, closes: 660 }]))).toEqual({ 1: 'range_order' });
    expect(validateWeekHours(week([{ opens: 660, closes: 660 }]))).toEqual({ 1: 'range_order' });
  });

  it('flags overlapping ranges on the same day', () => {
    expect(
      validateWeekHours(
        week([
          { opens: 660, closes: 900 },
          { opens: 840, closes: 1000 },
        ]),
      ),
    ).toEqual({ 1: 'range_overlap' });
  });

  it('allows ranges that only touch', () => {
    expect(
      validateWeekHours(
        week([
          { opens: 660, closes: 900 },
          { opens: 900, closes: 1000 },
        ]),
      ),
    ).toEqual({});
  });

  it('flags more than two ranges', () => {
    expect(
      validateWeekHours(
        week([
          { opens: 360, closes: 420 },
          { opens: 660, closes: 900 },
          { opens: 1080, closes: 1320 },
        ]),
      ),
    ).toEqual({ 1: 'too_many_ranges' });
  });
});
