'use client';

import { useTranslations } from 'next-intl';
import { Button } from './button';

/** Shown by route-group error boundaries; never shows technical details (FR-047). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('common');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="text-lg font-semibold">{t('genericErrorTitle')}</p>
      <p className="text-base text-muted">{t('genericErrorBody')}</p>
      <Button onClick={onRetry}>{t('retry')}</Button>
    </div>
  );
}
