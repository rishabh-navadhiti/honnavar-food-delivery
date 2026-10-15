import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AgentTable } from '@/features/agents/components/agent-table';
import { listAgents } from '@/features/agents/queries';
import { requireSession } from '@/features/auth/session';
import { buttonClasses } from '@/shared/ui/button';

export default async function AdminAgentsPage() {
  await requireSession('admin');
  const t = await getTranslations('agentAdmin');
  const agents = await listAgents();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/admin/agents/new" className={buttonClasses('primary')}>
          {t('add')}
        </Link>
      </div>
      <AgentTable agents={agents} />
    </div>
  );
}
