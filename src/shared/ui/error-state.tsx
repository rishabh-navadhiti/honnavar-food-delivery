'use client';

import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { NotFound } from './icons/empty-illustrations';

/** Shown by route-group error boundaries; never shows technical details (FR-047). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('common');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <NotFound />
      <p className="text-heading font-bold">{t('genericErrorTitle')}</p>
      <p className="max-w-prose text-base text-muted">{t('genericErrorBody')}</p>
      <Button onClick={onRetry} icon={<RotateCw aria-hidden="true" />}>
        {t('retry')}
      </Button>
    </div>
  );
}
