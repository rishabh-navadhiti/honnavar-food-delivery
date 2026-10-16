import { Search } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { findOrderByNumber, getDispatchBoard } from '@/features/orders/admin-queries';
import { DispatchBoard } from '@/features/orders/components/dispatch-board';
import { LiveRefresh } from '@/shared/polling/live-refresh';
import { UpdatedAt } from '@/shared/polling/updated-at';
import { buttonClasses } from '@/shared/ui/button';

type Props = { searchParams: Promise<{ no?: string }> };

/** The dispatch board (FR-033), refreshing on its own; find any order by its number. */
export default async function DispatchPage({ searchParams }: Props) {
  await requireSession('admin');
  const t = await getTranslations('dispatch');
  const { no } = await searchParams;
  let notFoundNo: string | null = null;
  if (no) {
    const id = /^\d{1,9}$/.test(no.replace(/^#/, '')) ? await findOrderByNumber(Number(no.replace(/^#/, ''))) : null;
    if (id) redirect(`/admin/orders/${id}`);
    notFoundNo = no;
  }
  const now = new Date();
  const board = await getDispatchBoard(now);
  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-title font-bold">{t('title')}</h1>
          <UpdatedAt at={now} />
        </div>
        <form method="get" className="flex items-end gap-2" role="search">
          <label className="flex flex-col gap-1 text-small font-semibold">
            {t('findLabel')}
            <input name="no" inputMode="numeric" placeholder="1042" className="min-h-touch w-36 rounded-md border border-line-strong bg-surface px-3 text-base font-normal" />
          </label>
          <button type="submit" className={buttonClasses('secondary')}>
            <Search aria-hidden="true" />
            {t('find')}
          </button>
        </form>
      </div>
      {notFoundNo ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-base font-semibold text-danger">
          {t('notFound', { no: notFoundNo })}
        </p>
      ) : null}
      <DispatchBoard board={board} now={now} />
    </div>
  );
}
