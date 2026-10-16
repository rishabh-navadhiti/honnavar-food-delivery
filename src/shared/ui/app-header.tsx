import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CoastMark } from './icons/coast-mark';
import { LanguageSwitch } from './language-switch';

/**
 * The slim top bar (003): mark and wordmark, an optional surface label and actions, and the
 * language switch on every screen (FR-012). One bar, 56 px.
 */
export function AppHeader({ homeHref, surfaceLabel, actions }: { homeHref: string; surfaceLabel?: ReactNode; actions?: ReactNode }) {
  const t = useTranslations('common');
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/95 backdrop-blur-md">
      <div className="mx-auto flex h-topbar max-w-5xl items-center justify-between gap-2 ps-4 pe-1">
        <Link href={homeHref} className="flex min-h-touch min-w-0 items-center gap-2.5">
          <CoastMark className="size-[30px] shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="stretch-head truncate text-[1.19rem] font-bold leading-tight text-ink" data-truncate title={t('appName')}>
              {t('appName')}
            </span>
            {surfaceLabel ? <span className="mt-1 text-caption font-semibold leading-none text-subtle">{surfaceLabel}</span> : null}
          </span>
        </Link>
        <div className="flex shrink-0 items-center">
          {actions}
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
