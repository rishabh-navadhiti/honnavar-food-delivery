import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'open' | 'closed' | 'warn' | 'veg' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-secondary text-ink border-line',
  open: 'bg-green-50 text-open border-green-200',
  closed: 'bg-red-50 text-closed border-red-200',
  warn: 'bg-amber-50 text-warn border-amber-200',
  veg: 'bg-green-50 text-veg border-green-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
