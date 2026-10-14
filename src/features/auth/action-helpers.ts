import 'server-only';
import { log } from '@/shared/log';
import type { Result, ResultError } from '@/shared/result';
import type { Actor } from './actor-scope';
import { actorFromForm } from './actor';

export type ActionOutcome<T> = { actor: Actor; result: Result<T> } | { actor: null; result: { ok: false; error: ResultError } };

/**
 * Resolve the acting partner or admin from the form's surface, run the service, and turn thrown
 * errors into an `unexpected` result with a log entry (FR-047, Principle VII).
 */
export async function runAsKitchenActor<T>(
  action: string,
  formData: FormData,
  service: (actor: Actor) => Promise<Result<T>>,
): Promise<ActionOutcome<T>> {
  const actor = await actorFromForm(formData);
  if (!actor) return { actor: null, result: { ok: false, error: { code: 'unauthorised' } } };
  try {
    return { actor, result: await service(actor) };
  } catch (error) {
    log.error(`${action} failed`, {
      action,
      surface: actor.role,
      subjectId: actor.role === 'admin' ? actor.adminId : actor.signinId,
      error,
    });
    return { actor, result: { ok: false, error: { code: 'unexpected' } } };
  }
}
