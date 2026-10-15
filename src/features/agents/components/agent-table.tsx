import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { setAgentActiveAction } from '../actions';

type AgentRow = { id: string; name: string; phone: string; vehicleType: 'bicycle' | 'two_wheeler' | 'other'; vehicleReg: string | null; active: boolean };

export function AgentTable({ agents }: { agents: AgentRow[] }) {
  const t = useTranslations();
  if (agents.length === 0) return <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">{t('agentAdmin.empty')}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full text-base">
        <thead className="bg-secondary text-sm">
          <tr>
            <th scope="col" className="px-3 py-2 text-start">{t('agentAdmin.name')}</th>
            <th scope="col" className="px-3 py-2 text-start">{t('agentAdmin.phone')}</th>
            <th scope="col" className="px-3 py-2 text-start">{t('agentAdmin.vehicleType')}</th>
            <th scope="col" className="px-3 py-2 text-start">{t('agentAdmin.status')}</th>
            <th scope="col" className="px-3 py-2 text-start"><span className="sr-only">{t('common.edit')}</span></th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id} className="border-t border-line" data-testid="agent-row" data-phone={a.phone}>
              <td className="px-3 py-2 font-semibold">{a.name}</td>
              <td className="px-3 py-2">{formatPhone(a.phone)}</td>
              <td className="px-3 py-2">
                {t(`vehicleType.${a.vehicleType}`)}
                {a.vehicleReg ? <span className="ms-2 text-sm text-muted">{a.vehicleReg}</span> : null}
              </td>
              <td className="px-3 py-2">
                <Badge tone={a.active ? 'open' : 'closed'}>{a.active ? t('agentAdmin.active') : t('agentAdmin.inactive')}</Badge>
              </td>
              <td className="flex flex-wrap gap-2 px-3 py-2">
                <Link href={`/admin/agents/${a.id}`} className={buttonClasses('ghost', 'px-2')} aria-label={t('agentAdmin.edit', { name: a.name })}>
                  {t('common.edit')}
                </Link>
                <form action={setAgentActiveAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={a.active ? 'false' : 'true'} />
                  <button type="submit" className={buttonClasses(a.active ? 'secondary' : 'primary', 'px-3')}>
                    {a.active ? t('agentAdmin.deactivate') : t('agentAdmin.activate')}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
