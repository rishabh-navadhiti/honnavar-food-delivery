import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/client';
import { messages } from '../../db/schema';
import { makeOrder, truncateAll } from '../../db/test/helpers';
import { standInNotifier } from './stand-in';

beforeEach(truncateAll);

describe('STAND-IN notifier (FR-045)', () => {
  it('writes one message row and sends nothing', async () => {
    const order = await makeOrder();
    const at = new Date('2026-10-15T12:00:00+05:30');
    await standInNotifier.notify(
      db,
      { recipient: { kind: 'customer', customerId: order.customerId }, orderId: order.id, kind: 'order_placed', params: { orderNo: order.orderNo, amount: 150 } },
      at,
    );
    const rows = await db.select().from(messages).where(eq(messages.orderId, order.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      recipient: 'customer',
      customerId: order.customerId,
      kitchenId: null,
      agentId: null,
      kind: 'order_placed',
      params: { orderNo: order.orderNo, amount: 150 },
      createdAt: at,
    });
  });

  it('runs inside the caller’s transaction: a rollback leaves no row', async () => {
    const order = await makeOrder();
    await expect(
      db.transaction(async (tx) => {
        await standInNotifier.notify(
          tx,
          { recipient: { kind: 'kitchen', kitchenId: order.kitchenId }, orderId: order.id, kind: 'kitchen_new_order', params: { orderNo: order.orderNo } },
          new Date(),
        );
        throw new Error('roll back');
      }),
    ).rejects.toThrow('roll back');
    expect(await db.$count(messages)).toBe(0);
  });
});
