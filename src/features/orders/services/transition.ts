import 'server-only';
import { and, eq, isNull, type SQL } from 'drizzle-orm';
import type { OrderActor } from '@/features/auth/actor-scope';
import { messagesFor } from '@/features/notifications/domain/messages-for';
import { notifier } from '@/shared/adapters/notifications';
import { db, type Db, type Executor } from '@/shared/db/client';
import { agents, orderEvents, orders, type orderReason } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { canTransition, isFinal, type LifecycleActor, type OrderAction, type OrderStatus } from '../domain/lifecycle';
import { expireOverdueOrders } from './expire';

export type OrderReason = (typeof orderReason.enumValues)[number];

/** The assign action names the agent; whether that agent is active is looked up here. */
export type TransitionAction = Exclude<OrderAction, { type: 'assign' } | { type: 'expire' }> | { type: 'assign'; agentId: string };

export type TransitionInput = {
  orderId: string;
  action: TransitionAction;
  actor: OrderActor;
  now: Date;
  reason?: OrderReason;
  note?: string;
};

export type TransitionOutcome = { orderId: string; orderNo: number; status: OrderStatus; agentId: string | null };

function lifecycleActor(actor: OrderActor): LifecycleActor {
  return actor.role === 'agent' ? { role: 'agent', agentId: actor.agentId } : { role: actor.role };
}

/**
 * The one way an order changes (research R4). Runs lazy expiry for the order, then, in one
 * transaction: loads it, checks the actor may see it and that the lifecycle allows the action,
 * applies a compare-and-set update, records the `order_events` row and writes the messages.
 * A lost race returns `order_moved_on` with the current status. `database` defaults to the app's
 * client; the demo seed passes its own connection.
 */
export async function applyTransition(input: TransitionInput, database: Db = db): Promise<Result<TransitionOutcome>> {
  const { orderId, action, actor, now } = input;
  await expireOverdueOrders(database, now, { orderId });

  return database.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order || !visibleTo(order, actor)) return err('not_found');

    let lifecycleAction: OrderAction;
    if (action.type === 'assign') {
      const [agent] = await tx.select({ active: agents.active }).from(agents).where(eq(agents.id, action.agentId));
      if (!agent) return err('not_found');
      lifecycleAction = { type: 'assign', agentId: action.agentId, agentActive: agent.active };
    } else {
      lifecycleAction = action;
    }

    const decision = canTransition(order, lifecycleAction, lifecycleActor(actor));
    if (!decision.ok) {
      if (decision.code === 'order_moved_on' || decision.code === 'not_assignable') {
        return err(decision.code, undefined, { status: order.status });
      }
      return err(decision.code);
    }
    const next = decision.next;
    const isAssignment = next.event === 'assigned' || next.event === 'reassigned';
    const keepsReason = next.event === 'rejected' || (next.event === 'cancelled' && actor.role === 'admin');

    const updated = await tx
      .update(orders)
      .set({
        status: next.status,
        agentId: next.agentId,
        statusChangedAt: now,
        ...(isAssignment ? { assignedAt: now } : {}),
        ...(keepsReason ? { reason: input.reason ?? null, reasonNote: input.note ?? null } : {}),
        ...(next.event === 'delivered' && order.paymentMethod === 'cod' ? { cashCollected: order.grandTotal } : {}),
        ...(isFinal(next.status) ? { finishedAt: now } : {}),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status), sameAgent(order.agentId)))
      .returning({ id: orders.id });
    if (updated.length === 0) return movedOn(tx, orderId);

    await tx.insert(orderEvents).values({
      orderId,
      kind: next.event,
      actor: actor.role,
      actorPhone: actor.phone,
      agentId: isAssignment ? next.agentId : null,
      previousAgentId: next.event === 'reassigned' ? (next.previousAgentId ?? null) : null,
      reason: keepsReason ? (input.reason ?? null) : null,
      reasonNote: keepsReason ? (input.note ?? null) : null,
      at: now,
    });
    const messages = messagesFor(
      {
        kind: next.event,
        agentId: next.agentId,
        previousAgentId: next.previousAgentId ?? null,
        reason: keepsReason ? input.reason : null,
        reasonNote: keepsReason ? input.note : null,
      },
      order,
    );
    for (const message of messages) await notifier.notify(tx, message, now);

    return ok({ orderId, orderNo: order.orderNo, status: next.status, agentId: next.agentId });
  });
}

/** Customers see their own orders and partners their kitchen's; agents and admins are checked by the lifecycle. */
function visibleTo(order: { customerId: string; kitchenId: string }, actor: OrderActor): boolean {
  if (actor.role === 'customer') return order.customerId === actor.customerId;
  if (actor.role === 'partner') return order.kitchenId === actor.kitchenId;
  return true;
}

function sameAgent(agentId: string | null): SQL {
  return agentId ? eq(orders.agentId, agentId) : isNull(orders.agentId);
}

async function movedOn(executor: Executor, orderId: string): Promise<Result<never>> {
  const [current] = await executor.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId));
  return err('order_moved_on', undefined, { status: current?.status ?? 'unknown' });
}
