/**
 * STAND-IN: nothing is sent by SMS or WhatsApp. Each update is written to the in-app message log
 * (the `messages` table), which customers, partners and agents read on their Messages screen.
 *
 * Declared in spec 002 (FR-045) and docs/fidelity-matrix.md ("SMS / WhatsApp status updates").
 * Deterministic and never fails randomly. A real provider would keep the log row and add delivery
 * after commit inside this module; callers do not change.
 */
import { messages } from '../../db/schema';
import type { Notifier } from './types';

export const standInNotifier: Notifier = {
  async notify(executor, notification, at) {
    const { recipient } = notification;
    await executor.insert(messages).values({
      recipient: recipient.kind,
      customerId: recipient.kind === 'customer' ? recipient.customerId : null,
      kitchenId: recipient.kind === 'kitchen' ? recipient.kitchenId : null,
      agentId: recipient.kind === 'agent' ? recipient.agentId : null,
      orderId: notification.orderId,
      kind: notification.kind,
      params: notification.params,
      createdAt: at,
    });
  },
};
