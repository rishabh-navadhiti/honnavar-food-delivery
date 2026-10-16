import { Ban, Bike, BellRing, CheckCheck, ChefHat, CircleCheck, CircleX, PackageCheck, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { OrderStatus } from '../domain/lifecycle';

const look: Record<OrderStatus, { icon: LucideIcon; className: string }> = {
  placed: { icon: BellRing, className: 'bg-status-placed-soft text-status-placed' },
  accepted: { icon: CircleCheck, className: 'bg-status-accepted-soft text-status-accepted' },
  preparing: { icon: ChefHat, className: 'bg-status-preparing-soft text-status-preparing' },
  ready: { icon: PackageCheck, className: 'bg-status-ready-soft text-status-ready' },
  picked_up: { icon: Bike, className: 'bg-status-picked-soft text-status-picked' },
  delivered: { icon: CheckCheck, className: 'bg-status-delivered-soft text-status-delivered' },
  rejected: { icon: CircleX, className: 'bg-status-rejected-soft text-status-rejected' },
  cancelled: { icon: Ban, className: 'bg-status-cancelled-soft text-status-cancelled' },
};

/** The status as icon plus word on its own tint: the only place status colour appears (owner edit 2). */
export function StatusChip({ status }: { status: OrderStatus }) {
  const t = useTranslations('orderStatus');
  const { icon: Icon, className } = look[status];
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full ps-2 pe-2.5 text-[0.84rem] font-bold ${className}`}>
      <Icon aria-hidden="true" className="size-4" strokeWidth={2.3} />
      {t(status)}
    </span>
  );
}

