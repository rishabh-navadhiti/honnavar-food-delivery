import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { PartnerTable } from '@/features/kitchens/components/admin/partner-table';
import { listKitchensForAdmin } from '@/features/kitchens/queries';
import { buttonClasses } from '@/shared/ui/button';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const filtersSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']).optional().catch(undefined),
  type: z.enum(['restaurant', 'home_kitchen', 'cloud_kitchen']).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
});

export default async function AdminPartnersPage({ searchParams }: Props) {
  await requireSession('admin');
  const t = await getTranslations('admin');
  const raw = await searchParams;
  const filters = filtersSchema.parse({
    status: raw.status || undefined,
    type: raw.type || undefined,
    q: typeof raw.q === 'string' && raw.q ? raw.q : undefined,
  });
  const rows = await listKitchensForAdmin(filters);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('partnersTitle')}</h1>
        <Link href="/admin/partners/new" className={buttonClasses('primary')}>
          {t('addPartner')}
        </Link>
      </div>
      <PartnerTable rows={rows} filters={filters} />
    </div>
  );
}
