import 'server-only';
import type { Actor } from '@/features/auth/actor-scope';
import { getNewOrderFeed } from './partner-queries';

/** `GET /partner/orders/new`: the kitchen's Placed orders for the alert on every partner screen (research R3). */
export async function handleNewOrderFeed(partner: Actor | null, now: Date): Promise<Response> {
  if (!partner || partner.role !== 'partner') return Response.json({ error: 'unauthorised' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const orders = await getNewOrderFeed(partner.kitchenId, now);
  return Response.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
}
