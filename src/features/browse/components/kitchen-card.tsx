import { Bike, Cloud, House, MapPin, Store } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { etaRange } from '@/features/orders/domain/eta';
import { env } from '@/shared/env';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { Badge } from '@/shared/ui/badge';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';
import { VegMarkIcon } from '@/shared/ui/icons/veg-marks';
import type { KitchenSummary, KitchenType } from '../queries';
import { KitchenStateLabel } from './kitchen-state-label';

export const kitchenTypeIcon: Record<KitchenType, typeof Store> = { restaurant: Store, home_kitchen: House, cloud_kitchen: Cloud };

/**
 * One kitchen on the home list as a row (003, FR-015, research R12): a 96 px photo, then name, the
 * landmark as one secondary line, type, open state and delivery estimate. The whole row is one link.
 */
export function KitchenCard({ kitchen, now, priority = false }: { kitchen: KitchenSummary; now: Date; priority?: boolean }) {
  const t = useTranslations();
  const current = useLocale();
  const name = pickLocalized(kitchen.name, isLocale(current) ? current : 'en')?.text ?? '';
  const TypeIcon = kitchenTypeIcon[kitchen.type];
  const eta = etaRange(kitchen.prepMinutes, env.DELIVERY_MINUTES);
  const open = kitchen.state.kind === 'open';
  return (
    <li data-testid="kitchen-card" data-kitchen-id={kitchen.id} className="border-b border-line last:border-b-0">
      <Link
        href={`/kitchens/${kitchen.id}`}
        className="flex min-h-[120px] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Photo
          imageId={kitchen.photoImageId}
          alt={name}
          placeholder={kitchen.type}
          sizes="96px"
          priority={priority}
          className={`size-24 shrink-0 rounded-md ${open ? '' : 'opacity-60 grayscale'}`}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="stretch-head text-heading font-bold leading-[var(--lh-snug)] text-ink">
            <LocalizedText pair={kitchen.name} />
          </h2>
          <p className="flex min-w-0 items-center gap-1 text-caption text-muted">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate" data-truncate title={kitchen.landmark}>
              {kitchen.landmark}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge icon={<TypeIcon aria-hidden="true" />}>{t(`kitchenType.${kitchen.type}`)}</Badge>
            {kitchen.pureVeg ? (
              <Badge tone="veg" icon={<VegMarkIcon className="size-3.5" />}>
                {t('veg.pureVeg')}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <KitchenStateLabel state={kitchen.state} now={now} />
            {open ? (
              <span className="inline-flex items-center gap-1.5 text-small font-semibold text-ink">
                <Bike aria-hidden="true" className="size-4 shrink-0 text-sea" />
                {t('kitchen.etaShort', { from: eta.from, to: eta.to })}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
