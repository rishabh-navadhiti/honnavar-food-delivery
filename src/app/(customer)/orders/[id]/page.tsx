import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { CallButton } from '@/features/browse/components/call-button';
import { BillSummary } from '@/features/cart/components/bill-summary';
import { OrderNumber } from '@/features/orders/components/order-number';
import { PaymentLabel } from '@/features/orders/components/payment-label';
import { StatusBadge } from '@/features/orders/components/status-badge';
import { getCustomerOrder } from '@/features/orders/queries';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice, formatTime } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import { VegMark } from '@/shared/ui/veg-mark';

type Props = { params: Promise<{ id: string }> };

/** The customer's order page (FR-025). US5 adds the timeline, map, agent and cancel. */
export default async function OrderPage({ params }: Props) {
  const session = await requireSession('customer');
  const t = await getTranslations();
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const id = z.uuid().safeParse((await params).id);
  const now = new Date();
  const order = id.success ? await getCustomerOrder(session.subjectId, id.data, now) : null;
  if (!order) notFound();

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {t('orderPage.title')} <OrderNumber orderNo={order.orderNo} />
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          {order.finished ? null : (
            <span className="text-base font-semibold" data-testid="expected-by">
              {t('orderPage.expectedBy', { time: formatTime(order.expectedAt, locale) })}
            </span>
          )}
        </div>
      </header>

      <section aria-labelledby="kitchen-title" className="flex flex-col gap-2">
        <h2 id="kitchen-title" className="text-lg font-bold">
          <LocalizedText pair={order.kitchen.name} />
        </h2>
        {order.kitchen.phone ? <CallButton phone={order.kitchen.phone} /> : null}
      </section>

      <section aria-labelledby="items-title" className="flex flex-col gap-2">
        <h2 id="items-title" className="text-lg font-bold">
          {t('orderPage.items')}
        </h2>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-start justify-between gap-3 py-3">
              <span className="flex flex-col gap-1">
                <VegMark isVeg={item.isVeg} />
                <span className="text-base font-semibold">
                  <LocalizedText pair={item.name} />
                </span>
              </span>
              <span className="whitespace-nowrap text-base">
                {item.quantity}
                <span aria-hidden="true"> × </span>
                {formatPrice(item.priceRupees, locale)}
              </span>
            </li>
          ))}
        </ul>
        <BillSummary bill={order.bill} />
        <p className="text-base font-semibold" data-testid="payment">
          <PaymentLabel method={order.paymentMethod} />
        </p>
      </section>

      <section aria-labelledby="address-title" className="flex flex-col gap-1">
        <h2 id="address-title" className="text-lg font-bold">
          {t('orderPage.deliverTo')}
        </h2>
        <p className="text-base font-semibold">{t(`addressLabel.${order.address.label}`)}</p>
        <p className="text-base">{order.address.house}</p>
        {order.address.street ? <p className="text-base">{order.address.street}</p> : null}
        <p className="text-base text-muted">{order.address.landmark}</p>
        {order.address.riderNote ? <p className="text-sm text-muted">{order.address.riderNote}</p> : null}
      </section>
    </article>
  );
}
