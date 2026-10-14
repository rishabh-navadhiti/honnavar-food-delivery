import { getTranslations } from 'next-intl/server';
import { getAgentProfile } from '@/features/agents/queries';
import { requireSession } from '@/features/auth/session';
import { EmptyState } from '@/shared/ui/empty-state';

export default async function AgentHomePage() {
  const session = await requireSession('agent');
  const t = await getTranslations('agent');
  const agent = await getAgentProfile(session.subjectId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('greeting', { name: agent?.name ?? '' })}</h1>
      <EmptyState title={t('noDeliveriesTitle')} body={t('noDeliveriesBody')} />
    </div>
  );
}
