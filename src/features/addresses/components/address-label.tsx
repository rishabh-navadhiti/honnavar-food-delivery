import { Briefcase, House, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

const icons = { home: House, work: Briefcase, other: MapPin } as const;

/** "Home", "Work", "Other", or the customer's own name for an Other address (FR-054, amended), with its icon. */
export function AddressLabel({ label, labelText }: { label: 'home' | 'work' | 'other'; labelText?: string | null }) {
  const t = useTranslations('addressLabel');
  const Icon = icons[label];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      {label === 'other' && labelText ? labelText : t(label)}
    </span>
  );
}
