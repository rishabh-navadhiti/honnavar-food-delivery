import { describe, expect, it } from 'vitest';
import { istDayBounds } from './today';

describe('istDayBounds ("today" in IST)', () => {
  it('runs from IST midnight to the next IST midnight', () => {
    expect(istDayBounds(new Date('2026-10-15T13:00:00+05:30'))).toEqual({
      start: new Date('2026-10-15T00:00:00+05:30'),
      end: new Date('2026-10-16T00:00:00+05:30'),
    });
  });

  it('just before IST midnight is still that day', () => {
    expect(istDayBounds(new Date('2026-10-15T23:59:59+05:30')).start).toEqual(new Date('2026-10-15T00:00:00+05:30'));
  });

  it('just after IST midnight is the next day, even though UTC is still the previous date', () => {
    const justAfter = new Date('2026-10-16T00:00:01+05:30'); // 2026-10-15T18:30:01Z
    expect(istDayBounds(justAfter).start).toEqual(new Date('2026-10-16T00:00:00+05:30'));
  });
});
