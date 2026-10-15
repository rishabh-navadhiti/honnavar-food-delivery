import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong focus-visible:outline-primary',
  secondary: 'bg-secondary text-on-secondary border border-line hover:bg-line focus-visible:outline-ink',
  danger: 'bg-danger text-on-danger hover:opacity-90 focus-visible:outline-danger',
  ghost: 'bg-transparent text-ink underline-offset-4 hover:underline focus-visible:outline-ink',
};

export function buttonClasses(variant: ButtonVariant = 'primary', extra = ''): string {
  return [
    'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl px-5 py-2 text-base font-semibold',
    'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50',
    'disabled:cursor-not-allowed',
    variants[variant],
    extra,
  ].join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
};

export function ButtonLink({ href, variant = 'primary', className = '', ...props }: ButtonLinkProps) {
  return <Link href={href} className={buttonClasses(variant, className)} {...props} />;
}
