import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getOptionalSession } from '../session';
import { safeNext, type Surface } from '../surfaces';
import { CoastMark } from '@/shared/ui/icons/coast-mark';
import { DemoPanel } from '../../demo/components/demo-panel';
import { SignInForm } from './sign-in-form';

const titles: Record<Surface, string> = {
  customer: 'customerTitle',
  partner: 'partnerTitle',
  agent: 'agentTitle',
  admin: 'adminTitle',
};

/** A surface's own sign-in screen (FR-001). Already signed in? Go straight to the surface. */
export async function LoginScreen({ surface, next, below }: { surface: Surface; next?: string; below?: ReactNode }) {
  if (await getOptionalSession(surface)) redirect(safeNext(surface, next));
  const t = await getTranslations('auth');
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-2">
      <div className="flex flex-col items-start gap-3">
        <CoastMark className="size-12" />
        <h1 className="stretch-head text-display font-bold leading-[var(--lh-tight)]">{t(titles[surface])}</h1>
        <p className="text-base text-muted">{surface === 'customer' ? t('customerIntro') : t('staffIntro')}</p>
      </div>
      <div className="rounded-lg bg-surface p-4 shadow-2">
        <SignInForm surface={surface} next={next} />
      </div>
      <DemoPanel surface={surface} />
      {below}
    </div>
  );
}
