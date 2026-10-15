/** The bill for a cart or order (FR-003): every figure in whole rupees. Pure and test-first. */

export const MAX_QUANTITY = 20;

type PricedLine = { priceRupees: number; quantity: number };

export type Bill<L extends PricedLine> = {
  lines: (L & { lineTotal: number })[];
  itemTotal: number;
  deliveryFee: number;
  grandTotal: number;
};

export function bill<L extends PricedLine>(lines: L[], deliveryFee: number): Bill<L> {
  const priced = lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      throw new RangeError(`quantity must be 1–${MAX_QUANTITY}, got ${line.quantity}`);
    }
    return { ...line, lineTotal: line.priceRupees * line.quantity };
  });
  const itemTotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines: priced, itemTotal, deliveryFee, grandTotal: itemTotal + deliveryFee };
}
