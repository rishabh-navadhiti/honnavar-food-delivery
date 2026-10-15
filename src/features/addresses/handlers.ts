import 'server-only';
import { and, eq, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Actor, AgentActor, CustomerActor } from '@/features/auth/actor-scope';
import { geocoder } from '@/shared/adapters/geocoding';
import { readAudio } from '@/shared/audio/store';
import { db } from '@/shared/db/client';
import { customerAddresses, orders } from '@/shared/db/schema';
import { latitude, longitude } from './schemas';

/** Who is asking, from whichever surface sessions the request carries. */
export type Viewer = { customer?: CustomerActor; agent?: AgentActor; admin?: Actor };

const locale = z.enum(['en', 'kn']).default('en');
const searchQuery = z.object({ q: z.string().trim().min(3).max(100), locale });
const reverseQuery = z.object({ lat: latitude, lng: longitude, locale });

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function params(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams);
}

/** `GET /api/geo/search`: customers adding an address and admins placing a kitchen (research R7). */
export async function handleGeoSearch(url: URL, viewer: Viewer): Promise<Response> {
  if (!viewer.customer && !viewer.admin) return json({ error: 'unauthorised' }, 401);
  const parsed = searchQuery.safeParse(params(url));
  if (!parsed.success) return json({ error: 'invalid' }, 400);
  const result = await geocoder.search(parsed.data.q, { locale: parsed.data.locale });
  return result.ok ? json({ places: result.data }) : json({ error: result.error }, 503);
}

/** `GET /api/geo/reverse`: the address under the pin. */
export async function handleGeoReverse(url: URL, viewer: Viewer): Promise<Response> {
  if (!viewer.customer && !viewer.admin) return json({ error: 'unauthorised' }, 401);
  const parsed = reverseQuery.safeParse(params(url));
  if (!parsed.success) return json({ error: 'invalid' }, 400);
  const result = await geocoder.reverse({ lat: parsed.data.lat, lng: parsed.data.lng }, { locale: parsed.data.locale });
  return result.ok ? json({ label: result.data }) : json({ error: result.error }, 503);
}

const notFound = () => new Response(null, { status: 404 });

/**
 * `GET /voice-notes/[id]` (FR-055): personal audio, so only the customer whose address uses it, an
 * agent holding an unfinished order whose snapshot uses it, or an admin may hear it.
 */
export async function handleVoiceNote(id: string, viewer: Viewer): Promise<Response> {
  if (!z.uuid().safeParse(id).success) return notFound();
  if (!(await mayHear(id, viewer))) return notFound();
  const clip = await readAudio(id);
  if (!clip) return notFound();
  return new Response(new Uint8Array(clip.bytes), {
    headers: { 'Content-Type': clip.mime, 'Cache-Control': 'private, max-age=3600' },
  });
}

async function mayHear(id: string, viewer: Viewer): Promise<boolean> {
  if (viewer.admin) return true;
  if (viewer.customer) {
    const owned = await db.$count(
      customerAddresses,
      and(eq(customerAddresses.voiceNoteId, id), eq(customerAddresses.customerId, viewer.customer.customerId)),
    );
    if (owned > 0) return true;
  }
  if (viewer.agent) {
    const held = await db.$count(
      orders,
      and(
        eq(orders.addrVoiceNoteId, id),
        eq(orders.agentId, viewer.agent.agentId),
        notInArray(orders.status, ['delivered', 'rejected', 'cancelled']),
      ),
    );
    if (held > 0) return true;
  }
  return false;
}
