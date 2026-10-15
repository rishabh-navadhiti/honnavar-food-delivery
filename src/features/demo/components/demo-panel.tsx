import { getTranslations } from 'next-intl/server';
import { env } from '@/shared/env';
import { formatPhone } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { Surface } from '../../auth/surfaces';
import { getDemoAccounts } from '../queries';

/**
 * STAND-IN support: lists the role's demo accounts and the fixed code, only when DEMO_MODE is on
 * (FR-011). Never rendered in a non-demo deployment.
 */
export async function DemoPanel({ surface }: { surface: Surface }) {
  if (!env.DEMO_MODE) return null;
  const t = await getTranslations('demo');
  const accounts = await getDemoAccounts(surface);
  return (
    <aside data-testid="demo-panel" aria-labelledby="demo-panel-title" className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-ink">
      <h2 id="demo-panel-title" className="text-base font-bold uppercase tracking-wide text-warn">
        {t('title')}
      </h2>
      <p className="mt-1 text-sm">{t('body', { code: env.DEMO_OTP_CODE })}</p>
      <h3 className="mt-3 text-sm font-semibold">{t('accounts')}</h3>
      {accounts.length === 0 ? <p className="text-sm">{t('none')}</p> : null}
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {accounts.map((a) => (
          <li key={a.phone} data-phone={a.phone}>
            <span className="font-mono font-semibold">{formatPhone(a.phone)}</span>
            {a.name ? <span className="ms-2">{a.name}</span> : null}
            {a.kitchen ? (
              <span className="ms-2 text-muted">
                <LocalizedText pair={a.kitchen} />
              </span>
            ) : null}
            {a.inactive ? <span className="ms-2 font-semibold text-danger">{t('inactive')}</span> : null}
          </li>
        ))}
      </ul>
      {surface === 'customer' ? <p className="mt-2 text-sm text-muted">{t('customerHint')}</p> : null}
    </aside>
  );
}
