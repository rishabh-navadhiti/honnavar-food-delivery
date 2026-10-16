'use client';

import { House } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ButtonLink } from './button';
import { ErrorState } from './error-state';
import { NotFound } from './icons/empty-illustrations';

/** One placeholder block; pulses gently (not under reduced motion). */
export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-line/70 ${className}`} />;
}

/** The height of a kitchen row: 96 px photo plus padding (research R12). */
export function SkeletonRow() {
  return (
    <div aria-hidden="true" className="flex h-[120px] items-center gap-3 border-b border-line py-3">
      <SkeletonBox className="size-24 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonBox className="h-5 w-3/4" />
        <SkeletonBox className="h-4 w-1/2" />
        <SkeletonBox className="h-6 w-2/3" />
      </div>
    </div>
  );
}

/** The height of an order card on the partner, agent and order lists. */
export function SkeletonCard({ className = 'h-40' }: { className?: string }) {
  return <SkeletonBox className={`rounded-lg ${className}`} />;
}

/** A loading state that says so to screen readers; children reserve the real layout's boxes. */
export function LoadingFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{t('loading')}</span>
      {children}
    </div>
  );
}

export function RouteLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-7 w-2/3" />
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-32" />
    </LoadingFrame>
  );
}

export function RouteError({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}

export function RouteNotFound({ homeHref }: { homeHref: string }) {
  const t = useTranslations('common');
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center" data-testid="not-found">
      <NotFound />
      <p className="text-heading font-bold">{t('notFoundTitle')}</p>
      <p className="max-w-prose text-base text-muted">{t('notFoundBody')}</p>
      <ButtonLink href={homeHref} variant="secondary" icon={<House aria-hidden="true" />}>
        {t('goHome')}
      </ButtonLink>
    </div>
  );
}
