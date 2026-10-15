import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents, customers } from './identity';
import { kitchens } from './kitchens';
import { orders } from './orders';

export const messageRecipient = pgEnum('message_recipient', ['customer', 'kitchen', 'agent']);
export const messageKind = pgEnum('message_kind', [
  'order_placed',
  'order_accepted',
  'order_rejected',
  'order_preparing',
  'order_picked_up',
  'order_delivered',
  'order_cancelled',
  'kitchen_new_order',
  'kitchen_agent_assigned',
  'kitchen_order_cancelled',
  'agent_assigned',
  'agent_unassigned',
  'agent_order_cancelled',
]);

/** Stable scalar values only; the text is built from translation keys at display time (research R14). */
export type MessageParams = {
  orderNo: number;
  amount?: number;
  reason?: string;
  reasonNote?: string;
  agentId?: string;
};

/** The SMS and WhatsApp stand-in: an in-app message log per recipient (FR-045). */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipient: messageRecipient('recipient').notNull(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    kitchenId: uuid('kitchen_id').references(() => kitchens.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: messageKind('kind').notNull(),
    params: jsonb('params').$type<MessageParams>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('messages_customer_idx').on(t.customerId, t.createdAt),
    index('messages_kitchen_idx').on(t.kitchenId, t.createdAt),
    index('messages_agent_idx').on(t.agentId, t.createdAt),
    check(
      'messages_one_recipient',
      sql`(${t.recipient} = 'customer' and ${t.customerId} is not null and ${t.kitchenId} is null and ${t.agentId} is null)
        or (${t.recipient} = 'kitchen' and ${t.kitchenId} is not null and ${t.customerId} is null and ${t.agentId} is null)
        or (${t.recipient} = 'agent' and ${t.agentId} is not null and ${t.customerId} is null and ${t.kitchenId} is null)`,
    ),
  ],
);
