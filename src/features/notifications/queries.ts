import 'server-only';
import { desc, eq, inArray } from 'drizzle-orm';
import type { MessageKind, NotificationRecipient } from '@/shared/adapters/notifications';
import { db } from '@/shared/db/client';
import { agents, kitchens, messages, orders, type MessageParams } from '@/shared/db/schema';
import type { LocalizedPair } from '@/shared/i18n/localized';

export type MessageView = {
  id: string;
  kind: MessageKind;
  params: MessageParams;
  createdAt: Date;
  orderId: string;
  kitchenName: LocalizedPair;
  agentName: string | null;
};

const LIMIT = 100;

/**
 * One person's message log, the SMS and WhatsApp stand-in (FR-045, FR-047): newest first, at most
 * 100. Kitchen messages are shared by everyone on the kitchen's sign-in list.
 */
export async function listMessages(recipient: NotificationRecipient): Promise<MessageView[]> {
  const where =
    recipient.kind === 'customer'
      ? eq(messages.customerId, recipient.customerId)
      : recipient.kind === 'kitchen'
        ? eq(messages.kitchenId, recipient.kitchenId)
        : eq(messages.agentId, recipient.agentId);
  const rows = await db
    .select({ message: messages, kitchenEn: kitchens.nameEn, kitchenKn: kitchens.nameKn })
    .from(messages)
    .innerJoin(orders, eq(orders.id, messages.orderId))
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(LIMIT);
  const agentIds = [...new Set(rows.map((r) => r.message.params.agentId).filter((id): id is string => Boolean(id)))];
  const names = agentIds.length > 0 ? await db.select({ id: agents.id, name: agents.name }).from(agents).where(inArray(agents.id, agentIds)) : [];
  return rows.map(({ message, kitchenEn, kitchenKn }) => ({
    id: message.id,
    kind: message.kind,
    params: message.params,
    createdAt: message.createdAt,
    orderId: message.orderId,
    kitchenName: { en: kitchenEn, kn: kitchenKn },
    agentName: names.find((a) => a.id === message.params.agentId)?.name ?? null,
  }));
}
