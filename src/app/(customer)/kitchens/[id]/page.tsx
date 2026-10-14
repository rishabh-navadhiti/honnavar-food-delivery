import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { CallButton } from '@/features/browse/components/call-button';
import { HoursTable } from '@/features/browse/components/hours-table';
import { KitchenStateLabel } from '@/features/browse/components/kitchen-state-label';
import { MenuSection } from '@/features/browse/components/menu-section';
import { getKitchenForCustomer } from '@/features/browse/queries';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';

type Props = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

async function load(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return null;
  return getKitchenForCustomer(parsed.data, { now: new Date() });
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
        {hasMenu ? (
          kitchen.categories
            .filter((c) => c.dishes.length > 0)
            .map((category) => <MenuSection key={category.id} category={category} />)
        ) : (
          <EmptyState title={t('kitchen.menuComingSoon')} />
        )}
      </section>
    </article>
  );
}
