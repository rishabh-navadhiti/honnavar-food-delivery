import { currentActor } from '@/features/auth/actor';
import { handleNewOrderFeed } from '@/features/orders/handlers';

export async function GET(): Promise<Response> {
  return handleNewOrderFeed(await currentActor('partner'), new Date());
}
