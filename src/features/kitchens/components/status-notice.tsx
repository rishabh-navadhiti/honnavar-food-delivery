import { useTranslations } from 'next-intl';

/** Pending or suspended kitchens are invisible to customers; say so and why (FR-037). */
export function StatusNotice({ status, reason }: { status: 'pending' | 'active' | 'suspended'; reason: string | null }) {
  const t = useTranslations('partner');
  if (status === 'active') return null;
  return (
    <div role="status" data-testid="status-notice" className="rounded-lg border border-amber-300 bg-warn-soft p-4 text-base text-ink">
      {status === 'pending' ? t('pendingNotice') : t('suspendedNotice', { reason: reason ?? '' })}
    </div>
  );
}
