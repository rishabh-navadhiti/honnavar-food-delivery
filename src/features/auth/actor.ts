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


/**
 * Kitchen operations are shared by the partner and admin surfaces (FR-054). The form says which
 * surface it was rendered on; that only selects which session cookie to check, never grants access.
 */
export async function actorFromForm(formData: FormData): Promise<Actor | null> {
  const surface = formData.get('surface');
  if (surface !== 'partner' && surface !== 'admin') return null;
  return currentActor(surface);
}

/** Where the kitchen editors live on each surface. */
export function editorBasePath(actor: Actor, kitchenId: string): string {
  return actor.role === 'partner' ? '/partner' : `/admin/partners/${kitchenId}`;
}
