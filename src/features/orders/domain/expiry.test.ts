import { describe, expect, it } from 'vitest';
import { acceptDeadline, isOverdue, timeLeftMs } from './expiry';

const placedAt = new Date('2026-10-15T12:00:00+05:30');
const at = (ms: number) => new Date(placedAt.getTime() + ms);
const MIN = 60_000;

describe('acceptance window (FR-020)', () => {
  it('ends exactly the window after placing', () => {
    expect(acceptDeadline(placedAt, 10)).toEqual(at(10 * MIN));
  });

  it('is not overdue at exactly the deadline, and overdue just after', () => {
    expect(isOverdue(placedAt, at(10 * MIN), 10)).toBe(false);
    expect(isOverdue(placedAt, at(10 * MIN + 1), 10)).toBe(true);
    expect(isOverdue(placedAt, at(0), 10)).toBe(false);
  });

  it('counts down the time left and never goes negative', () => {
    expect(timeLeftMs(placedAt, at(3 * MIN), 10)).toBe(7 * MIN);
    expect(timeLeftMs(placedAt, at(10 * MIN), 10)).toBe(0);
    expect(timeLeftMs(placedAt, at(60 * MIN), 10)).toBe(0);
  });
});
