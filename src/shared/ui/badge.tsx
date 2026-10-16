import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'open' | 'closed' | 'warn' | 'veg' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunk text-muted border-line',
  open: 'bg-open-soft text-open border-transparent',
  closed: 'bg-closed-soft text-closed border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  veg: 'bg-veg-soft text-veg border-transparent',
  info: 'bg-sea-soft text-sea-strong border-transparent',
};

/** A small label with an optional icon; meaning is always in its words (Principle IV). */
export function Badge({ tone = 'neutral', icon, children, className = '' }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex min-h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption font-semibold [&_svg]:size-3.5 ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
