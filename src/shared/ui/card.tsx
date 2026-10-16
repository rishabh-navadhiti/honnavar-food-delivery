import type { HTMLAttributes } from 'react';

/**
 * A surface card (003). `attention` marks what needs doing first (a waiting order) with a neutral
 * ink outline: no coloured ring, rail or tint (owner edit 2).
 */
export function Card({ className = '', tone = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { tone?: 'default' | 'attention' }) {
  const ring = tone === 'attention' ? 'shadow-[0_0_0_2px_var(--color-ink),var(--shadow-2)]' : 'shadow-1';
  return <div className={`rounded-lg border border-line bg-surface p-4 ${ring} ${className}`} {...props} />;
}
