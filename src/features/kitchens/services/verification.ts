import 'server-only';
import { eq } from 'drizzle-orm';
import { verificationProvider, type VerificationKind } from '@/shared/adapters/verification';
import { db } from '@/shared/db/client';
import { kitchens, verifications } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import type { Actor } from '../../auth/actor-scope';
import { requireAdmin } from './admin';

/**
 * Record an FSSAI licence (restaurants, cloud kitchens) or a hygiene-check reference (home kitchens)
 * with the verifying admin and time (FR-021). Goes through the STAND-IN verification adapter.
 */
export async function recordVerification(
  actor: Actor,
  input: { kitchenId: string; kind: VerificationKind; reference: string },
): Promise<Result<object>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const [kitchen] = await db.select({ type: kitchens.type }).from(kitchens).where(eq(kitchens.id, input.kitchenId));
  if (!kitchen) return err('not_found');
  const expected: VerificationKind = kitchen.type === 'home_kitchen' ? 'hygiene_check' : 'fssai_licence';
  if (input.kind !== expected) return err('kind_mismatch');
  const reference = input.reference.trim();
  if (expected === 'fssai_licence' && !/^\d{14}$/.test(reference)) return err('invalid', { reference: 'invalidFssai' });
  if (expected === 'hygiene_check' && (reference.length < 3 || reference.length > 40)) {
    return err('invalid', { reference: 'invalidHygieneRef' });
  }
  const checked = await verificationProvider.check({ kind: expected, reference });
  if (checked.status === 'rejected') return err('invalid', { reference: expected === 'fssai_licence' ? 'invalidFssai' : 'invalidHygieneRef' });
  const values = { kind: expected, reference, verifiedByAdminId: admin.data.adminId, verifiedAt: new Date() };
  await db
    .insert(verifications)
    .values({ kitchenId: input.kitchenId, ...values })
    .onConflictDoUpdate({ target: verifications.kitchenId, set: values });
  return ok({});
}
