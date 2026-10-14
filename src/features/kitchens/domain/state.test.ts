import { describe, expect, it } from 'vitest';
import { emptyWeek, type WeekHours } from './hours';
import { kitchenState } from './state';

/** A wall-clock time in India Standard Time. 2026-10-12 is a Monday. */
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

const notClosed = { closedAt: null, reopensAt: null };

describe('kitchenState', () => {
  it('is open inside a range, including exactly at opening time', () => {
    expect(kitchenState(notClosed, lunchAndDinnerDaily, ist('2026-10-12T12:00'))).toEqual({
      kind: 'open',
      closesAt: ist('2026-10-12T15:00'),
    });
    expect(kitchenState(notClosed, lunchAndDinnerDaily, ist('2026-10-12T11:00')).kind).toBe('open');
  });

  it('is closed exactly at closing time, with the next opening', () => {
    expect(kitchenState(notClosed, lunchAndDinnerDaily, ist('2026-10-12T15:00'))).toEqual({
      kind: 'closed',
      nextOpening: ist('2026-10-12T18:00'),
    });
  });

  it('gives the first range of the day before opening', () => {
    expect(kitchenState(notClosed, lunchAndDinnerDaily, ist('2026-10-12T08:00'))).toEqual({
      kind: 'closed',
      nextOpening: ist('2026-10-12T11:00'),
    });
  });

  it('gives the next day after the last range', () => {
    expect(kitchenState(notClosed, lunchAndDinnerDaily, ist('2026-10-12T23:00'))).toEqual({
      kind: 'closed',
      nextOpening: ist('2026-10-13T11:00'),
    });
  });

  it('wraps from Sunday to Monday', () => {
    const mondayOnly: WeekHours = { ...emptyWeek(), 1: [{ opens: 600, closes: 840 }] };
    // 2026-10-18 is a Sunday.
    expect(kitchenState(notClosed, mondayOnly, ist('2026-10-18T20:00'))).toEqual({
      kind: 'closed',
      nextOpening: ist('2026-10-19T10:00'),
    });
  });

  it('skips closed days', () => {
    const mondayOnly: WeekHours = { ...emptyWeek(), 1: [{ opens: 600, closes: 840 }] };
    expect(kitchenState(notClosed, mondayOnly, ist('2026-10-12T15:00'))).toEqual({
      kind: 'closed',
      nextOpening: ist('2026-10-19T10:00'),
    });
  });

  it('treats a range ending at midnight as open until midnight', () => {
    const lateNight: WeekHours = { ...emptyWeek(), 1: [{ opens: 1110, closes: 1440 }] };
    expect(kitchenState(notClosed, lateNight, ist('2026-10-12T23:59')).kind).toBe('open');
  });

  it('reports hours not set when there are no ranges at all', () => {
    expect(kitchenState(notClosed, emptyWeek(), ist('2026-10-12T12:00'))).toEqual({ kind: 'hoursNotSet' });
  });

  it('is temporarily closed while a closure is in force', () => {
    const closure = { closedAt: ist('2026-10-12T12:00'), reopensAt: ist('2026-10-12T18:00') };
    expect(kitchenState(closure, lunchAndDinnerDaily, ist('2026-10-12T13:00'))).toEqual({
      kind: 'temporarilyClosed',
      reopensAt: ist('2026-10-12T18:00'),
    });
  });

  it('is temporarily closed indefinitely when there is no reopening time', () => {
    const closure = { closedAt: ist('2026-10-12T12:00'), reopensAt: null };
    expect(kitchenState(closure, emptyWeek(), ist('2026-10-20T13:00'))).toEqual({
      kind: 'temporarilyClosed',
      reopensAt: null,
    });
  });

  it('returns to normal hours once the reopening time has passed', () => {
    const closure = { closedAt: ist('2026-10-12T12:00'), reopensAt: ist('2026-10-12T18:00') };
    expect(kitchenState(closure, lunchAndDinnerDaily, ist('2026-10-12T18:00')).kind).toBe('open');
  });
});
