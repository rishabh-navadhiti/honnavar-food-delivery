import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A filter chip (003): a 48 px tap box around a 38 px pill. The active chip is ink-filled and says so
 * with aria-current and a screen-reader word, so the state is never colour alone.
 */
function face(pressed: boolean): string {
  return [
    'inline-flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-small font-semibold',
    'transition-colors duration-(--duration-fast) [&_svg]:size-4',
    pressed ? 'border-ink bg-ink text-surface' : 'border-line-strong/45 bg-surface text-ink [&_svg]:text-muted',
  ].join(' ');
}

const box = 'inline-flex min-h-touch shrink-0 items-center';

/** A chip that navigates (filters kept in the URL); `aria-current` marks the active one. */
export function ChipLink({
  href,
  pressed = false,
  icon,
  testId,
  children,
}: {
  href: string;
  pressed?: boolean;
  icon?: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-current={pressed ? 'true' : undefined} data-testid={testId} data-active={pressed} className={box}>
      <span className={face(pressed)}>
        {icon}
        {children}
      </span>
    </Link>
  );
}
