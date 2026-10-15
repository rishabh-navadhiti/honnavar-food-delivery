import { useTranslations } from 'next-intl';

/** "Home", "Work", "Other", or the customer's own name for an Other address (FR-054, amended). */
export function AddressLabel({ label, labelText }: { label: 'home' | 'work' | 'other'; labelText?: string | null }) {
  const t = useTranslations('addressLabel');
  return <>{label === 'other' && labelText ? labelText : t(label)}</>;
}
