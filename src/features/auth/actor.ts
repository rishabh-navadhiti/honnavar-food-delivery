import 'server-only';
import type { Actor } from './actor-scope';
import { getOptionalSession } from './session';

/**
 * The actor behind the current request on the partner or admin surface, or null when there is no
 * valid session. Action wrappers turn null into an `unauthorised` result.
 */
export async function currentActor(surface: 'partner' | 'admin'): Promise<Actor | null> {
  const session = await getOptionalSession(surface);
  if (!session) return null;
  if (surface === 'partner') {
    if (!session.kitchenId) return null;
    return { role: 'partner', phone: session.phone, signinId: session.subjectId, kitchenId: session.kitchenId };
  }
  return { role: 'admin', phone: session.phone, adminId: session.subjectId };
}

