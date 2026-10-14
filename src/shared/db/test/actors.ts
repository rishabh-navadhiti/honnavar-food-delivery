import type { Actor } from '@/features/auth/actor-scope';
import { makeAdmin, makeSignin } from './helpers';

export async function partnerActor(kitchenId: string): Promise<Actor> {
  const signin = await makeSignin(kitchenId);
  return { role: 'partner', phone: signin.phone, signinId: signin.id, kitchenId };
}

export async function adminActor(): Promise<Actor> {
  const admin = await makeAdmin();
  return { role: 'admin', phone: admin.phone, adminId: admin.id };
}
