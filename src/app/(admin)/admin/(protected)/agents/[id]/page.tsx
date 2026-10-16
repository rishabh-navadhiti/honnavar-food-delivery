import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { AgentForm } from '@/features/agents/components/agent-form';
import { getAgentProfile } from '@/features/agents/queries';
import { requireSession } from '@/features/auth/session';

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditAgentPage({ params }: Props) {
  await requireSession('admin');
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const agent = await getAgentProfile(id.data);
  if (!agent) notFound();
  const t = await getTranslations('agentAdmin');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('editTitle')}</h1>
      <AgentForm agent={agent} />
    </div>
  );
}
