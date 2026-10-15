import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AgentTable } from '@/features/agents/components/agent-table';
import { listAgents } from '@/features/agents/queries';
import { requireSession } from '@/features/auth/session';
import { buttonClasses } from '@/shared/ui/button';

type Props = { searchParams: Promise<{ refused?: string; orders?: string }> };

export default async function AdminAgentsPage({ searchParams }: Props) {
  await requireSession('admin');
  const t = await getTranslations();
  const agents = await listAgents();
  const { refused, orders } = await searchParams;
  const refusedAgent = refused ? agents.find((a) => a.id === refused) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('agentAdmin.title')}</h1>
        <Link href="/admin/agents/new" className={buttonClasses('primary')}>
          {t('agentAdmin.add')}
        </Link>
      </div>
      {refusedAgent && orders ? (
        <p role="alert" className="rounded-xl border border-danger bg-red-50 p-3 text-base font-medium text-danger" data-testid="agent-refused">
          {refusedAgent.name}: {t('errors.agentHasOrders', { orderNos: orders })}
        </p>
      ) : null}
      <AgentTable agents={agents} />
    </div>
  );
}
