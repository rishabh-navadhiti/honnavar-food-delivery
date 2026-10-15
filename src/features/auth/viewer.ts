import 'server-only';
import type { Viewer } from '@/features/addresses/handlers';
import { currentActor, currentAgent, currentCustomer } from './actor';

/** Every surface session the request carries, for route handlers shared by several surfaces. */
export async function currentViewer(): Promise<Viewer> {
  const [customer, agent, admin] = await Promise.all([currentCustomer(), currentAgent(), currentActor('admin')]);
  return { customer: customer ?? undefined, agent: agent ?? undefined, admin: admin ?? undefined };
}
