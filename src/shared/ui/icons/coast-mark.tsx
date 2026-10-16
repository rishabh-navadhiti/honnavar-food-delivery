/** The Coast mark: a bowl on the river waves, beside the wordmark (003 design pick). */
export function CoastMark({ className = 'size-8', label }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M6.5 15.5h19a9.5 9.5 0 0 1-19 0Z" fill="#fff6ea" />
      <path d="M7 10.5c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0 3-1.6 4.5 0 3 1.6 4.5 0" fill="none" stroke="#f8c97f" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.5 19.5c1.2.9 2.4.9 3.6 0s2.4-.9 3.6 0 2.4.9 3.6 0" className="stroke-sea" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </svg>
  );
}
