import { Briefcase, House, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

const icons = { home: House, work: Briefcase, other: MapPin } as const;

/**
 * "Home", "Work", "Other", or the customer's own name for an Other address (FR-054, amended), with its icon
 * set inline on the text baseline, so it lines up where the label runs into text ("Home: Door …").
 */
export function AddressLabel({ label, labelText }: { label: 'home' | 'work' | 'other'; labelText?: string | null }) {
  const t = useTranslations('addressLabel');
  const Icon = icons[label];
  return (
    <span>
      <Icon aria-hidden="true" className="me-1.5 inline size-4 align-[-0.15em] text-primary" />
      {label === 'other' && labelText ? labelText : t(label)}
    </span>
  );
}
