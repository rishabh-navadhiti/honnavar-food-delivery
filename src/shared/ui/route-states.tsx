'use client';

import { useTranslations } from 'next-intl';
import { ButtonLink } from './button';
import { ErrorState } from './error-state';

export function RouteLoading() {
  const t = useTranslations('common');
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 px-4 py-6">
      <span className="sr-only">{t('loading')}</span>
      <div className="h-6 w-2/3 animate-pulse rounded bg-line" />
      <div className="h-32 animate-pulse rounded-2xl bg-line" />
      <div className="h-32 animate-pulse rounded-2xl bg-line" />
    </div>
  );
}

export function RouteError({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}

export function RouteNotFound({ homeHref }: { homeHref: string }) {
  const t = useTranslations('common');
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="text-lg font-semibold">{t('notFoundTitle')}</p>
      <p className="text-base text-muted">{t('notFoundBody')}</p>
      <ButtonLink href={homeHref} variant="secondary">
        {t('goHome')}
      </ButtonLink>
    </div>
  );
}
