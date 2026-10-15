import 'server-only';
import { and, eq, lt, sql, type SQL } from 'drizzle-orm';
import { messagesFor } from '@/features/notifications/domain/messages-for';
import { notifier } from '@/shared/adapters/notifications';
import type { Executor } from '@/shared/db/client';
import { orderEvents, orders } from '@/shared/db/schema';
import { env } from '@/shared/env';

export type ExpiryScope =
  | { all: true }
  | { orderId: string }
  | { kitchenId: string }
  | { customerId: string };

function scopeCondition(scope: ExpiryScope): SQL | undefined {
  if ('orderId' in scope) return eq(orders.id, scope.orderId);
  if ('kitchenId' in scope) return eq(orders.kitchenId, scope.kitchenId);
  if ('customerId' in scope) return eq(orders.customerId, scope.customerId);
  return undefined;
}

/**
 * Lazy automatic rejection (FR-020, research R5): every Placed order in `scope` whose acceptance
 * window has passed becomes Rejected with reason `kitchen_no_response`, recorded by the system at
 * `now`, with the customer's message. Runs before any read or write that touches orders, so no
 * background job is needed. The `status = 'placed'` condition makes it safe against a racing accept.
 * Returns how many orders it rejected.
 */
export async function expireOverdueOrders(executor: Executor, now: Date, scope: ExpiryScope): Promise<number> {
  const deadline = new Date(now.getTime() - env.ACCEPT_WINDOW_MINUTES * 60_000);
  const run = async (tx: Executor) => {
    const expired = await tx
      .update(orders)
      .set({ status: 'rejected', reason: 'kitchen_no_response', statusChangedAt: now, finishedAt: now })
      .where(and(eq(orders.status, 'placed'), lt(orders.placedAt, deadline), scopeCondition(scope)))
      .returning({
        id: orders.id,
        orderNo: orders.orderNo,
        customerId: orders.customerId,
        kitchenId: orders.kitchenId,
        grandTotal: orders.grandTotal,
      });
    for (const order of expired) {
      await tx.insert(orderEvents).values({
        orderId: order.id,
        kind: 'rejected',
        actor: 'system',
        reason: 'kitchen_no_response',
        at: now,
      });
      for (const message of messagesFor({ kind: 'rejected', reason: 'kitchen_no_response' }, { ...order, agentId: null })) {
        await notifier.notify(tx, message, now);
      }
    }
    return expired.length;
  };
  // Cheap check first, so reads that find nothing overdue never open a write transaction.
  const [due] = await executor
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, 'placed'), lt(orders.placedAt, deadline), scopeCondition(scope)));
  if (!due || due.n === 0) return 0;
  return executor.transaction(run);
}
