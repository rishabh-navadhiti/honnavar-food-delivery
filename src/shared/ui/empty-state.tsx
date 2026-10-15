import type { ReactNode } from 'react';

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {body ? <p className="max-w-prose text-base text-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
