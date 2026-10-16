import { MapPin, Navigation, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AddressLabel } from '@/features/addresses/components/address-label';
import { VoiceNotePlayer } from '@/shared/audio/voice-note-player';
import { openInMapsUrl } from '@/shared/maps/open-in-maps';
import { buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LocalizedText } from '@/shared/ui/localized-text';
import { PhoneLink } from '@/shared/ui/phone-link';
import { VegMark } from '@/shared/ui/veg-mark';
import type { AgentOrderDetail as Detail } from '../agent-queries';
import { AgentSteps } from './agent-steps';
import { OrderNumber } from './order-number';
import { PaymentLabel } from './payment-label';
import { StatusBadge } from './status-badge';

/** Everything the agent needs to collect and deliver one order (FR-040, FR-041). */
export function AgentOrderDetail({ order }: { order: Detail }) {
  const t = useTranslations();
  const kitchenText = [order.kitchen.name.en ?? order.kitchen.name.kn, order.kitchen.address, order.kitchen.landmark, 'Honnavar'].filter(Boolean).join(', ');
  const deliveryText = [order.address.house, order.address.street, order.address.landmark, 'Honnavar'].filter(Boolean).join(', ');
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-title font-bold">
          <OrderNumber orderNo={order.orderNo} />
        </h1>
        <StatusBadge status={order.status} />
      </header>

      <AgentSteps orderId={order.id} status={order.status} paymentMethod={order.paymentMethod} grandTotal={order.grandTotal} />

      <Card className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-heading font-bold">
          <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
            <Store aria-hidden="true" className="size-4" />
          </span>
          {t('agentOrder.pickupFrom')}
        </h2>
        <p className="text-base font-semibold">
          <LocalizedText pair={order.kitchen.name} />
        </p>
        <p className="text-base">{order.kitchen.landmark}</p>
        <p className="text-small text-muted">{order.kitchen.address}</p>
        <a
          href={openInMapsUrl({ location: order.kitchen.location, text: kitchenText })}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('sea', 'w-full')}
          data-testid="maps-kitchen"
        >
          <Navigation aria-hidden="true" />
          {t('openInMaps.kitchen')}
        </a>
        {order.kitchen.phone ? <PhoneLink phone={order.kitchen.phone} label={t('agentOrder.callKitchen')} /> : null}
        <ul className="mt-1 flex flex-col gap-1 border-t border-line pt-2">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <VegMark isVeg={item.isVeg} />
                <LocalizedText pair={item.name} />
              </span>
              <span className="font-bold">{t('partnerOrders.quantity', { quantity: item.quantity })}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-heading font-bold">
          <span className="grid size-8 place-items-center rounded-full bg-sea-soft text-sea">
            <MapPin aria-hidden="true" className="size-4" />
          </span>
          {t('agentOrder.deliverTo')}
        </h2>
        <p className="text-base font-semibold">{order.customer.name ?? t('partnerOrders.customer')}</p>
        <p className="text-base">
          <AddressLabel label={order.address.label} labelText={order.address.labelText} />: {order.address.house}
        </p>
        {order.address.street ? <p className="text-base">{order.address.street}</p> : null}
        <p className="text-base font-semibold">{order.address.landmark}</p>
        {order.address.riderNote ? <p className="rounded-md bg-warn-soft p-2.5 text-base">{order.address.riderNote}</p> : null}
        {order.address.voiceNoteId ? <VoiceNotePlayer voiceNoteId={order.address.voiceNoteId} /> : null}
        <a
          href={openInMapsUrl({ location: order.address.location, text: deliveryText })}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('sea', 'w-full')}
          data-testid="maps-delivery"
        >
          <Navigation aria-hidden="true" />
          {t('openInMaps.delivery')}
        </a>
        <PhoneLink phone={order.customer.phone} label={t('agentOrder.callCustomer')} />
      </Card>

      <Card className="flex flex-col gap-1">
        <p className="text-base">
          <PaymentLabel method={order.paymentMethod} />
        </p>
      </Card>
    </article>
  );
}
