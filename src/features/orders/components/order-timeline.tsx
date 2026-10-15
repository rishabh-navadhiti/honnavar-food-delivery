import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatTime } from '@/shared/i18n/format';
import type { OrderEventKind, OrderStatus } from '../domain/lifecycle';
import type { CustomerOrderView } from '../queries';
import { ReasonText } from './reason-text';

const STEPS: OrderEventKind[] = ['placed', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered'];

/**
 * The status timeline (US5): each step with its time once done. A rejected or cancelled order ends
 * with that step and its reason; UPI orders say nothing was charged (FR-023).
 */
export function OrderTimeline({ order }: { order: CustomerOrderView }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const firstAt = (kind: OrderEventKind) => order.events.find((e) => e.kind === kind || (kind === 'assigned' && e.kind === 'reassigned'))?.at;
  const ended: OrderStatus | null = order.status === 'rejected' || order.status === 'cancelled' ? order.status : null;
  const endedAt = ended ? order.events.find((e) => e.kind === ended)?.at : undefined;
  const steps = ended ? STEPS.filter((s) => firstAt(s)) : STEPS;

  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-2">
      <h2 id="timeline-title" className="text-lg font-bold">
        {t('timeline.title')}
      </h2>
      <ol className="flex flex-col gap-0" data-testid="timeline">
        {steps.map((step) => {
          const at = firstAt(step);
          return (
            <li key={step} data-step={step} data-done={Boolean(at)} className="flex items-center gap-3 py-1.5">
              <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${at ? 'bg-open' : 'border-2 border-line bg-surface'}`} />
              <span className={`flex-1 text-base ${at ? 'font-semibold' : 'text-muted'}`}>{t(`orderEvent.${step}`)}</span>
              <span className="text-sm text-muted">{at ? formatTime(at, locale) : t('timeline.pending')}</span>
            </li>
          );
        })}
        {ended ? (
          <li data-step={ended} data-done="true" className="flex flex-col gap-1 py-1.5">
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-closed" />
              <span className="flex-1 text-base font-semibold text-closed">{t(`orderEvent.${ended === 'rejected' ? 'rejected' : 'cancelled'}`)}</span>
              {endedAt ? <span className="text-sm text-muted">{formatTime(endedAt, locale)}</span> : null}
            </span>
            {order.reason ? <ReasonText reason={order.reason} note={order.reasonNote} className="ps-6 text-base" /> : null}
            {order.paymentMethod === 'upi_demo' ? <p className="ps-6 text-base font-medium" data-testid="nothing-charged">{t('timeline.nothingCharged')}</p> : null}
          </li>
        ) : null}
      </ol>
    </section>
  );
}
