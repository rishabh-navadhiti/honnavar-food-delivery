import { describe, expect, it } from 'vitest';
import { bill, MAX_QUANTITY } from './bill';

describe('bill (FR-003, SC-005)', () => {
  it('gives line totals, item total, delivery fee and grand total', () => {
    expect(
      bill(
        [
          { priceRupees: 60, quantity: 2 },
          { priceRupees: 180, quantity: 1 },
        ],
        30,
      ),
    ).toEqual({
      lines: [
        { priceRupees: 60, quantity: 2, lineTotal: 120 },
        { priceRupees: 180, quantity: 1, lineTotal: 180 },
      ],
      itemTotal: 300,
      deliveryFee: 30,
      grandTotal: 330,
    });
  });

  it('keeps extra line fields', () => {
    expect(bill([{ dishId: 'd1', priceRupees: 10, quantity: 3 }], 0).lines[0]).toEqual({
      dishId: 'd1',
      priceRupees: 10,
      quantity: 3,
      lineTotal: 30,
    });
  });

  it('always makes the grand total the item total plus the fee', () => {
    for (const fee of [0, 15, 30, 500]) {
      const result = bill([{ priceRupees: 99, quantity: 7 }], fee);
      expect(result.grandTotal).toBe(result.itemTotal + fee);
    }
  });

  it('refuses quantities outside 1–20', () => {
    expect(MAX_QUANTITY).toBe(20);
    expect(() => bill([{ priceRupees: 10, quantity: 0 }], 30)).toThrow(RangeError);
    expect(() => bill([{ priceRupees: 10, quantity: 21 }], 30)).toThrow(RangeError);
    expect(() => bill([{ priceRupees: 10, quantity: 1.5 }], 30)).toThrow(RangeError);
  });
});
