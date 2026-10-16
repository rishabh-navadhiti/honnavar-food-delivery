import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * A back link to a fixed parent screen, never `history.back` (convergence, Principle IV): top left,
 * 48 px target, an arrow plus a translated label.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      data-testid="back-link"
      className="inline-flex min-h-touch items-center gap-1.5 self-start pe-2 text-base font-semibold text-primary-strong hover:underline underline-offset-4"
    >
      <ArrowLeft aria-hidden="true" className="size-5" />
      {label}
    </Link>
  );
}
