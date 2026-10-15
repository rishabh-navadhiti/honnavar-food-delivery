import { describe, expect, it } from 'vitest';
import { emptyWeek, type WeekHours } from './hours';
import { closureEnd } from './closure';

const ist = (local: string) => new Date(`${local}:00+05:30`);

const lunchAndDinnerDaily: WeekHours = Object.fromEntries(
  [1, 2, 3, 4, 5, 6, 7].map((d) => [
    d,
    [
      { opens: 660, closes: 900 },
      { opens: 1080, closes: 1320 },
    ],
  ]),
) as WeekHours;

describe('closureEnd (FR-031)', () => {
  it('closing during lunch reopens at dinner the same day', () => {
    expect(closureEnd(lunchAndDinnerDaily, ist('2026-10-12T12:00'))).toEqual(ist('2026-10-12T18:00'));
  });

  it('closing before the first period cancels that period', () => {
    expect(closureEnd(lunchAndDinnerDaily, ist('2026-10-12T08:00'))).toEqual(ist('2026-10-12T18:00'));
  });

  it('closing during the last period reopens at the next day’s first period', () => {
    expect(closureEnd(lunchAndDinnerDaily, ist('2026-10-12T19:00'))).toEqual(ist('2026-10-13T11:00'));
  });

  it('closing between periods cancels the upcoming one', () => {
    expect(closureEnd(lunchAndDinnerDaily, ist('2026-10-12T16:00'))).toEqual(ist('2026-10-13T11:00'));
  });

  it('closing after the last period of the day cancels the next day’s first period', () => {
    expect(closureEnd(lunchAndDinnerDaily, ist('2026-10-12T23:00'))).toEqual(ist('2026-10-13T18:00'));
  });

  it('returns null when there is no future period to reopen at', () => {
    expect(closureEnd(emptyWeek(), ist('2026-10-12T12:00'))).toBeNull();
  });

  it('with a single weekly period, reopens a week later', () => {
    const mondayLunch: WeekHours = { ...emptyWeek(), 1: [{ opens: 660, closes: 900 }] };
    expect(closureEnd(mondayLunch, ist('2026-10-12T12:00'))).toEqual(ist('2026-10-19T11:00'));
  });

  it('recalculates from the original closing time with edited hours', () => {
    const closedAt = ist('2026-10-12T12:00');
    const dinnerFrom1700: WeekHours = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((d) => [
        d,
        [
          { opens: 660, closes: 900 },
          { opens: 1020, closes: 1320 },
        ],
      ]),
    ) as WeekHours;
    expect(closureEnd(dinnerFrom1700, closedAt)).toEqual(ist('2026-10-12T17:00'));
  });
});
