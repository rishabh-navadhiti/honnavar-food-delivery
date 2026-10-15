import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppHeader } from '@/shared/ui/app-header';

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('surface');
  return (
    <>
      <AppHeader homeHref="/partner" surfaceLabel={t('partner')} />
      {children}
    </>
  );
}
