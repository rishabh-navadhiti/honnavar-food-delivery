import { getTranslations } from 'next-intl/server';
import { env } from '@/shared/env';
import { formatPhone } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { Surface } from '../../auth/surfaces';
import { getDemoAccounts } from '../queries';

/**
 * STAND-IN support (FR-011): "Demo only", the role's demo accounts, and the fixed OTP. Shown once
 * per sign-in screen, only when DEMO_MODE is on.
 */
export async function DemoPanel({ surface }: { surface: Surface }) {
  if (!env.DEMO_MODE) return null;
  const t = await getTranslations('demo');
  const accounts = await getDemoAccounts(surface);
  return (
    <aside data-testid="demo-panel" aria-labelledby="demo-panel-title" className="rounded-md border border-dashed border-line-strong/60 bg-surface-sunk px-3.5 py-3 text-small text-ink">
      <h2 id="demo-panel-title" className="text-caption font-semibold uppercase tracking-wide text-muted">
        {t('title')}
      </h2>
      <ul className="mt-1 flex flex-col gap-0.5">
        {accounts.map((a) => (
          <li key={a.phone} data-phone={a.phone} className="flex flex-wrap gap-x-2">
            <span>
              {a.name}
              {a.kitchen ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <LocalizedText pair={a.kitchen} />
                </>
              ) : null}
            </span>
            <span className="font-mono">{formatPhone(a.phone)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 font-semibold" data-testid="demo-otp">
        {t('otp', { code: env.DEMO_OTP_CODE })}
      </p>
    </aside>
  );
}
