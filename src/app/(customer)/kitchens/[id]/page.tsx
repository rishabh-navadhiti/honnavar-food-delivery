import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { setDishFilter } from '@/features/browse/actions';
import { CallButton } from '@/features/browse/components/call-button';
import { DishFilterControl } from '@/features/browse/components/dish-filter-control';
import { HoursTable } from '@/features/browse/components/hours-table';
import { KitchenStateLabel } from '@/features/browse/components/kitchen-state-label';
import { MenuSection } from '@/features/browse/components/menu-section';
import { readDishFilter } from '@/features/browse/dish-filter-cookie';
import { getKitchenForCustomer } from '@/features/browse/queries';
import { AddToCart } from '@/features/cart/components/add-to-cart';
import { CurrentCartBar } from '@/features/cart/components/cart-bar';
import { readCart } from '@/features/cart/cookie';
import { etaRange } from '@/features/orders/domain/eta';
import { env } from '@/shared/env';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { Badge } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';

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

  return (
    <article className="flex flex-col gap-5">
      <Link href="/" className="min-h-touch self-start py-3 text-base font-medium text-primary">
        <span aria-hidden="true">← </span>
        {t('kitchen.allKitchens')}
      </Link>
      <Photo
        imageId={kitchen.photoImageId}
        alt={name}
        placeholder={kitchen.type}
        sizes="(max-width: 768px) 100vw, 768px"
        priority
        className="aspect-[4/3] w-full rounded-2xl"
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">
          <LocalizedText pair={kitchen.name} />
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{t(`kitchenType.${kitchen.type}`)}</Badge>
          {kitchen.pureVeg ? <Badge tone="veg">{t('veg.pureVeg')}</Badge> : null}
        </div>
        <KitchenStateLabel state={kitchen.state} now={now} />
        <p className="text-base font-medium" data-testid="eta-range">
          {t('kitchen.etaRange', { from: eta.from, to: eta.to })}
        </p>
        <LocalizedText pair={kitchen.description} className="text-base text-muted" />
      </header>

      {primary ? <CallButton phone={primary.phone} /> : null}

      <section aria-labelledby="address-title" className="flex flex-col gap-1">
        <h2 id="address-title" className="text-lg font-bold">
          {t('kitchen.addressTitle')}
        </h2>
        <p className="text-base font-medium">{kitchen.landmark}</p>
        <p className="text-base text-muted">{kitchen.address}</p>
      </section>

      <section aria-labelledby="hours-title" className="flex flex-col gap-2">
        <h2 id="hours-title" className="text-lg font-bold">
          {t('kitchen.hoursTitle')}
        </h2>
        <HoursTable hours={kitchen.hours} now={now} />
      </section>

      <section aria-labelledby="menu-title" className="flex flex-col gap-4">
        <h2 id="menu-title" className="text-xl font-bold">
          {t('kitchen.menuTitle')}
        </h2>
        <DishFilterControl current={dishFilter} returnTo={returnTo} />
        {open ? null : (
          <p className="rounded-xl border border-line bg-secondary p-3 text-base font-medium" data-testid="ordering-closed">
            {t('cart.orderWhenOpen')}
          </p>
        )}
        {kitchen.noMatchingDishes ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-surface p-4" data-testid="no-matching-dishes">
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
      <CurrentCartBar />
    </article>
  );
}
