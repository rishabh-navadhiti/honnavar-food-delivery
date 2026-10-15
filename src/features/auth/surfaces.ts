export const surfaces = ['customer', 'partner', 'agent', 'admin'] as const;
export type Surface = (typeof surfaces)[number];

export const SURFACE_HOME: Record<Surface, string> = {
  customer: '/',
  partner: '/partner',
  agent: '/agent',
  admin: '/admin',
};

export const SURFACE_LOGIN: Record<Surface, string> = {
  customer: '/login',
  partner: '/partner/login',
  agent: '/agent/login',
  admin: '/admin/login',
};

/** One cookie per surface, so signing in on one never signs you in on another (FR-002). */
export const SESSION_COOKIE: Record<Surface, string> = {
  customer: 'hfd_session_customer',
  partner: 'hfd_session_partner',
  agent: 'hfd_session_agent',
  admin: 'hfd_session_admin',
};

/** A `next` redirect target is honoured only within the same surface. */
export function safeNext(surface: Surface, next: string | null | undefined): string {
  const home = SURFACE_HOME[surface];
  if (!next || !next.startsWith('/') || next.startsWith('//')) return home;
  if (surface === 'customer') {
    const otherPrefixes = ['/partner', '/agent', '/admin'];
    return otherPrefixes.some((p) => next === p || next.startsWith(`${p}/`)) ? home : next;
  }
  return next === home || next.startsWith(`${home}/`) ? next : home;
}
