import { safeNext } from '@/features/auth/surfaces';

/** Where the add/edit address screens go back to: the `next` target, or the address list. */
export function addressBackHref(next: string | undefined): string {
  const target = safeNext('customer', next);
  return target === '/' && next !== '/' ? '/addresses' : target;
}
