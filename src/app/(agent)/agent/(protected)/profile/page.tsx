import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAgentProfile } from '@/features/agents/queries';
import { requireSession } from '@/features/auth/session';
import { formatPhone } from '@/shared/i18n/format';
import { Card } from '@/shared/ui/card';

export default async function AgentProfilePage() {
  const session = await requireSession('agent');
  const t = await getTranslations();
  const agent = await getAgentProfile(session.subjectId);
  if (!agent) notFound();
  const rows: [string, string][] = [
    [t('agent.name'), agent.name],
    [t('agent.phone'), formatPhone(agent.phone)],
    [t('agent.vehicle'), t(`vehicleType.${agent.vehicleType}`)],
  ];
  if (agent.vehicleReg) rows.push([t('agent.vehicleReg'), agent.vehicleReg]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('agent.profileTitle')}</h1>
      <Card>
        <dl className="flex flex-col gap-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-small font-semibold text-muted">{label}</dt>
              <dd className="text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
