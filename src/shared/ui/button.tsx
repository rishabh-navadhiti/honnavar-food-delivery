import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'sea' | 'danger' | 'ghost';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-[0_6px_16px_-8px_rgb(184_70_26/0.7)] hover:bg-primary-strong focus-visible:outline-primary',
  secondary: 'bg-surface text-ink border border-line-strong/45 hover:bg-surface-sunk focus-visible:outline-ink',
  tonal: 'bg-primary-soft text-primary-strong border border-primary/15 hover:bg-primary-tint focus-visible:outline-primary',
  sea: 'bg-surface text-sea border border-sea/30 hover:bg-sea-soft focus-visible:outline-sea',
  danger: 'bg-danger text-on-danger hover:opacity-90 focus-visible:outline-danger',
  ghost: 'bg-transparent text-primary-strong px-2 hover:underline underline-offset-4 focus-visible:outline-ink',
};

/** Coast buttons (003): 48 px minimum, 14 px radius, a 120 ms press (none under reduced motion). */
export function buttonClasses(variant: ButtonVariant = 'primary', extra = ''): string {
  return [
    'inline-flex min-h-touch items-center justify-center gap-2 rounded-md px-[18px] py-2 text-base font-semibold',
    'transition-[background-color,transform] duration-(--duration-fast) ease-out-soft active:scale-[0.98]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    '[&_svg]:size-5 [&_svg]:shrink-0',
    variants[variant],
    extra,
  ].join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: ReactNode };

export function Button({ variant = 'primary', className = '', type = 'button', icon, children, ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
};

export function ButtonLink({ href, variant = 'primary', className = '', icon, children, ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
