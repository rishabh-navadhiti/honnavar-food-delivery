import type { OrderStatus } from '../domain/lifecycle';
import { StatusChip } from './status-chip';

/** The order status as icon, word and tint, never colour alone (Principle IV); see StatusChip. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <StatusChip status={status} />;
}
