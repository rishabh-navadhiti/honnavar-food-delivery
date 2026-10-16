/**
 * The Indian food marks (003, research R3): a square outline with a filled circle for veg, and with
 * a filled triangle for non-veg. Decorative; the label is always given beside them (Principle IV).
 */
export function VegMarkIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2.5" className="fill-surface stroke-veg" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="3.6" className="fill-veg" />
    </svg>
  );
}

export function NonVegMarkIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2.5" className="fill-surface stroke-nonveg" strokeWidth="1.6" />
      <path d="M8 4.2 11.8 11H4.2Z" className="fill-nonveg" />
    </svg>
  );
}
