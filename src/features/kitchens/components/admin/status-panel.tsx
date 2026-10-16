'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { setKitchenStatusAction, type AdminFormState } from '../../actions/admin';

type Status = 'pending' | 'active' | 'suspended';

/** Activate (needs verification), suspend (needs a reason) or move back to pending (FR-020, FR-022). */
export function StatusPanel({ kitchenId, status, reason }: { kitchenId: string; status: Status; reason: string | null }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(setKitchenStatusAction, {});
  const errors = useErrorText(state.error);
  const tone = status === 'active' ? 'open' : status === 'suspended' ? 'closed' : 'warn';
  return (
    <Card className="flex flex-col gap-3" data-testid="status-panel">
      <h2 className="text-heading font-bold">{t('admin.statusTitle')}</h2>
      <p className="flex items-center gap-2">
        <Badge tone={tone}>{t('admin.statusNow', { status: t(`status.${status}`) })}</Badge>
      </p>
      {status === 'suspended' && reason ? <p className="text-base text-muted">{reason}</p> : null}
      <div className="flex flex-wrap gap-2">
        {status !== 'active' ? (
          <form action={formAction}>
            <input type="hidden" name="kitchenId" value={kitchenId} />
            <input type="hidden" name="status" value="active" />
            <Button type="submit" disabled={pending}>
              {t('admin.activate')}
            </Button>
          </form>
        ) : null}
        {status !== 'pending' ? (
          <form action={formAction}>
            <input type="hidden" name="kitchenId" value={kitchenId} />
            <input type="hidden" name="status" value="pending" />
            <Button type="submit" variant="secondary" disabled={pending}>
              {t('admin.moveToPending')}
            </Button>
          </form>
        ) : null}
      </div>
      {status !== 'suspended' ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="kitchenId" value={kitchenId} />
          <input type="hidden" name="status" value="suspended" />
          <TextField name="reason" label={t('admin.suspendReason')} maxLength={200} defaultValue={state.values?.reason} />
          <Button type="submit" variant="danger" disabled={pending} className="self-start">
            {t('admin.suspend')}
          </Button>
        </form>
      ) : null}
      <FormError message={errors.form} />
    </Card>
  );
}
