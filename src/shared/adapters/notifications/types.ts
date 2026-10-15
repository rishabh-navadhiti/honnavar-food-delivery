import type { Executor } from '../../db/client';
import type { messageKind, MessageParams } from '../../db/schema/messages';

export type MessageKind = (typeof messageKind.enumValues)[number];

export type NotificationRecipient =
  | { kind: 'customer'; customerId: string }
  | { kind: 'kitchen'; kitchenId: string }
  | { kind: 'agent'; agentId: string };

/** One SMS or WhatsApp status update (002 FR-045, FR-046). */
export type Notification = {
  recipient: NotificationRecipient;
  orderId: string;
  kind: MessageKind;
  params: MessageParams;
};

/** Status updates by SMS or WhatsApp (Principle III: one adapter, stable interface). */
export interface Notifier {
  /** Record (and, for a real provider, send) one update. Runs inside the caller's transaction. */
  notify(executor: Executor, notification: Notification, at: Date): Promise<void>;
}
