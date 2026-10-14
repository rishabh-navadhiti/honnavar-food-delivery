import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { Badge } from '@/shared/ui/badge';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';
import type { KitchenSummary } from '../queries';
import { KitchenStateLabel } from './kitchen-state-label';

/** One kitchen on the home list. The whole card is a single large link (Principle IV). */
export function KitchenCard({ kitchen, now, priority = false }: { kitchen: KitchenSummary; now: Date; priority?: boolean }) {
  const t = useTranslations();
  const current = useLocale();
  const name = pickLocalized(kitchen.name, isLocale(current) ? current : 'en')?.text ?? '';
  return (
    <li data-testid="kitchen-card" data-kitchen-id={kitchen.id}>
      <Link
        href={`/kitchens/${kitchen.id}`}
        className="flex gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Photo
          imageId={kitchen.photoImageId}
          alt={name}
          placeholder={kitchen.type}
          sizes="112px"
          priority={priority}
          className="size-28 shrink-0 rounded-xl"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="text-lg font-bold leading-snug text-ink">
            <LocalizedText pair={kitchen.name} />
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{t(`kitchenType.${kitchen.type}`)}</Badge>
            {kitchen.pureVeg ? <Badge tone="veg">{t('veg.pureVeg')}</Badge> : null}
          </div>
          <KitchenStateLabel state={kitchen.state} now={now} />
          <p className="truncate text-sm text-muted">{kitchen.landmark}</p>
        </div>
      </Link>
    </li>
  );
}
