import type { ReactNode } from 'react';
import { illustrations, type IllustrationName } from './icons/empty-illustrations';

/** An empty list: an illustration, one message and one next step where there is one (FR-024). */
export function EmptyState({
  title,
  body,
  action,
  illustration,
}: {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  illustration?: IllustrationName;
}) {
  const Illustration = illustration ? illustrations[illustration] : null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-surface px-4 py-6 text-center shadow-1">
      {Illustration ? <Illustration /> : null}
      <p className="text-heading font-bold text-ink">{title}</p>
      {body ? <p className="max-w-prose text-base text-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
