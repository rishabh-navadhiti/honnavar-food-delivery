'use client';

import { ArrowLeftRight, UserPlus } from 'lucide-react';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { assignAgentAction, type AdminOrderState } from '../actions/admin';
import type { BoardAgent } from '../admin-queries';

/** Assign or reassign an active agent, showing how many undelivered orders each already holds (FR-034). */
export function AssignAgentForm({ orderId, currentAgentId, agents }: { orderId: string; currentAgentId: string | null; agents: BoardAgent[] }) {
  const t = useTranslations('dispatch');
  const [state, formAction, pending] = useActionState<AdminOrderState, FormData>(assignAgentAction, {});
  const errors = useErrorText(state.error);
  const choices = agents.filter((a) => a.id !== currentAgentId);
  if (choices.length === 0) return <p className="text-small text-muted">{t('noAgents')}</p>;
  return (
    <form action={formAction} className="flex flex-col gap-2" data-testid="assign-form">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="flex flex-col gap-1 text-caption font-semibold text-muted">
        {currentAgentId ? t('reassignTo') : t('assignTo')}
        <select name="agentId" required className="h-10 rounded-md border border-line-strong bg-surface px-2 text-small font-semibold text-ink">
          {choices.map((a) => (
            <option key={a.id} value={a.id}>
              {t('agentOption', { name: a.name, count: a.undelivered })}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={buttonClasses(currentAgentId ? 'secondary' : 'primary', '', 'compact')}>
        {currentAgentId ? <ArrowLeftRight aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
        {currentAgentId ? t('reassign') : t('assign')}
      </button>
      <FormError message={errors.form} />
    </form>
  );
}
