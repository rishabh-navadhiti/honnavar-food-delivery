import Link from 'next/link';

/**
 * A back link to a fixed parent screen, never `history.back` (convergence, Principle IV): top left,
 * 48 px target, "←" plus a translated label.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} data-testid="back-link" className="flex min-h-touch items-center gap-1 self-start py-2 text-base font-medium text-primary">
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
