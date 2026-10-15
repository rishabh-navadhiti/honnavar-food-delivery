import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/shared/ui/badge';
import type { OrderStatus } from '../domain/lifecycle';

const tones: Record<OrderStatus, BadgeTone> = {
  placed: 'warn',
  accepted: 'info',
  preparing: 'info',
  ready: 'info',
  picked_up: 'info',
  delivered: 'open',
  rejected: 'closed',
  cancelled: 'closed',
};

/** The order status as colour plus text, never colour alone (Principle IV). */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('orderStatus');
  return (
    <Badge tone={tones[status]} className="whitespace-nowrap">
      {t(status)}
    </Badge>
  );
}
