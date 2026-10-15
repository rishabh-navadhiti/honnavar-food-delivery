import { getTranslations } from 'next-intl/server';
import { AgentForm } from '@/features/agents/components/agent-form';
import { requireSession } from '@/features/auth/session';

export default async function AdminNewAgentPage() {
  await requireSession('admin');
  const t = await getTranslations('agentAdmin');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('newTitle')}</h1>
      <AgentForm />
    </div>
  );
}
