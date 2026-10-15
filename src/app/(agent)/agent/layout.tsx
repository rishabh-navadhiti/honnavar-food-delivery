import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppHeader } from '@/shared/ui/app-header';

export default async function AgentLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('surface');
  return (
    <>
      <AppHeader homeHref="/agent" surfaceLabel={t('agent')} />
      {children}
    </>
  );
}
