import { Bike, ChevronDown, MapPin, MoonStar } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { setDishFilter } from '@/features/browse/actions';
import { CallButton } from '@/features/browse/components/call-button';
import { DishFilterControl } from '@/features/browse/components/dish-filter-control';
import { HoursTable } from '@/features/browse/components/hours-table';
import { kitchenTypeIcon } from '@/features/browse/components/kitchen-card';
import { KitchenStateLabel } from '@/features/browse/components/kitchen-state-label';
import { MenuSection } from '@/features/browse/components/menu-section';
import { readDishFilter } from '@/features/browse/dish-filter-cookie';
import { getKitchenForCustomer } from '@/features/browse/queries';
import { AddToCart } from '@/features/cart/components/add-to-cart';
import { readCart } from '@/features/cart/cookie';
import { etaRange } from '@/features/orders/domain/eta';
import { env } from '@/shared/env';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { Badge } from '@/shared/ui/badge';
import { VegMarkIcon } from '@/shared/ui/icons/veg-marks';
import { buttonClasses } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';
import { CustomerTabBar } from '@/features/cart/components/customer-tab-bar';
import { BackLink } from '@/shared/ui/back-link';

type Props = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

async function load(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return null;
  return getKitchenForCustomer(parsed.data, { now: new Date(), dishFilter: await readDishFilter() });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kitchen = await load((await params).id);
  const current = await getLocale();
  const t = await getTranslations('common');
  const name = kitchen ? pickLocalized(kitchen.name, isLocale(current) ? current : 'en')?.text : null;
  return { title: name ? `${name} · ${t('appName')}` : t('appName') };
}

export default async function KitchenPage({ params }: Props) {
  const kitchen = await load((await params).id);
  if (!kitchen) notFound();
  const t = await getTranslations();
  const current = await getLocale();
  const name = pickLocalized(kitchen.name, isLocale(current) ? current : 'en')?.text ?? '';
  const now = new Date();
  const primary = kitchen.contacts[0];
  const hasMenu = kitchen.categories.some((c) => c.dishes.length > 0);
  const dishFilter = await readDishFilter();
  const returnTo = `/kitchens/${kitchen.id}`;
  const cart = await readCart();
  const qtyOf = (dishId: string) => (cart?.kitchenId === kitchen.id ? (cart.lines.find((l) => l.dishId === dishId)?.qty ?? 0) : 0);
  const open = kitchen.state.kind === 'open';
  const eta = etaRange(kitchen.prepMinutes, env.DELIVERY_MINUTES);
  const TypeIcon = kitchenTypeIcon[kitchen.type];

  return (
    <article className="flex flex-col gap-4">
      <BackLink href="/" label={t('kitchen.allKitchens')} />
      <Photo
        imageId={kitchen.photoImageId}
        alt={name}
        placeholder={kitchen.type}
        sizes="(max-width: 768px) 100vw, 768px"
        priority
        className="-mx-4 aspect-[16/9] rounded-none sm:mx-0 sm:rounded-lg"
      />
      <header className="relative -mt-14 mx-1 flex flex-col gap-2.5 rounded-lg bg-surface p-3 shadow-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="stretch-head text-title font-bold leading-[var(--lh-tight)]">
            <LocalizedText pair={kitchen.name} />
          </h1>
          {primary ? <CallButton phone={primary.phone} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge icon={<TypeIcon aria-hidden="true" />}>{t(`kitchenType.${kitchen.type}`)}</Badge>
          {kitchen.pureVeg ? (
            <Badge tone="veg" icon={<VegMarkIcon className="size-3.5" />}>
              {t('veg.pureVeg')}
            </Badge>
          ) : null}
          <KitchenStateLabel state={kitchen.state} now={now} />
        </div>
        <p className="flex items-center gap-2 text-base font-semibold" data-testid="eta-range">
          <Bike aria-hidden="true" className="size-5 shrink-0 text-sea" />
          {t('kitchen.etaRange', { from: eta.from, to: eta.to })}
        </p>
        <details className="group border-t border-line pt-1">
          <summary className="flex min-h-touch cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
            <MapPin aria-hidden="true" className="size-5 shrink-0 text-muted" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-small font-bold">{t('kitchen.addressAndHours')}</span>
              <span className="truncate text-caption text-muted" data-truncate title={kitchen.landmark}>
                {kitchen.landmark}
              </span>
            </span>
            <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform duration-(--duration-base) group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 pb-2 pt-1">
            <section aria-labelledby="address-title" className="flex flex-col gap-0.5">
              <h2 id="address-title" className="text-small font-bold">
                {t('kitchen.addressTitle')}
              </h2>
              <p className="text-base font-medium">{kitchen.landmark}</p>
              <p className="text-small text-muted">{kitchen.address}</p>
            </section>
            <section aria-labelledby="hours-title" className="flex flex-col gap-1">
              <h2 id="hours-title" className="text-small font-bold">
                {t('kitchen.hoursTitle')}
              </h2>
              <HoursTable hours={kitchen.hours} now={now} />
            </section>
          </div>
        </details>
      </header>
      <LocalizedText pair={kitchen.description} className="px-1 text-base text-muted" />

      <section aria-labelledby="menu-title" className="flex flex-col gap-3">
        <h2 id="menu-title" className="sr-only">
          {t('kitchen.menuTitle')}
        </h2>
        <DishFilterControl current={dishFilter} returnTo={returnTo} />
        {open ? null : (
          <p className="flex items-center gap-2 rounded-md bg-closed-soft p-3 text-base font-semibold text-ink" data-testid="ordering-closed">
            <MoonStar aria-hidden="true" className="size-5 shrink-0 text-closed" />
            {t('cart.orderWhenOpen')}
          </p>
        )}
        {kitchen.noMatchingDishes ? (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-3 shadow-1" data-testid="no-matching-dishes">
            <p className="text-base font-semibold">{dishFilter === 'veg' ? t('dishFilter.noVegHere') : t('dishFilter.noNonvegHere')}</p>
            <form action={setDishFilter}>
              <input type="hidden" name="filter" value="all" />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className={buttonClasses('secondary')}>
                {t('dishFilter.showAll')}
              </button>
            </form>
          </div>
        ) : hasMenu ? (
          kitchen.categories
            .filter((c) => c.dishes.length > 0)
            .map((category) => (
              <MenuSection
                key={category.id}
                category={category}
                dishAction={open ? (dish) => <AddToCart dishId={dish.id} qty={qtyOf(dish.id)} /> : undefined}
              />
            ))
        ) : (
          <EmptyState title={t('kitchen.menuComingSoon')} />
        )}
      </section>
      <CustomerTabBar current="kitchen" />
    </article>
  );
}
