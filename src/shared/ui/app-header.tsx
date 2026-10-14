import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LanguageSwitch } from './language-switch';

/** Shared header: app name, an optional surface label and actions, and the language switch (FR-012). */
export function AppHeader({ homeHref, surfaceLabel, actions }: { homeHref: string; surfaceLabel?: ReactNode; actions?: ReactNode }) {
  const t = useTranslations('common');
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        <Link href={homeHref} className="flex min-h-touch flex-col justify-center">
          <span className="whitespace-nowrap text-lg font-bold text-primary">{t('appName')}</span>
          {surfaceLabel ? <span className="text-xs font-medium text-muted">{surfaceLabel}</span> : null}
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
