import { describe, expect, it } from 'vitest';
import { etaRange, expectedAt } from './eta';

describe('expected delivery time (FR-057 to FR-059)', () => {
  it('adds preparation and delivery minutes to the placing time', () => {
    expect(expectedAt(new Date('2026-10-15T12:00:00+05:30'), 25, 15)).toEqual(new Date('2026-10-15T12:40:00+05:30'));
  });

  it('gives the kitchen-page range: prep + delivery, to 10 minutes more', () => {
    expect(etaRange(25, 15)).toEqual({ from: 40, to: 50 });
    expect(etaRange(5, 1)).toEqual({ from: 6, to: 16 });
  });
});
