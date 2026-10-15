import { formatPhone } from '../i18n/format';
import { buttonClasses, type ButtonVariant } from './button';

/** Opens the phone's own dialler with a labelled, large target; not a telephony integration. */
export function PhoneLink({ phone, label, variant = 'secondary' }: { phone: string; label: string; variant?: ButtonVariant }) {
  return (
    <a href={`tel:+91${phone}`} className={buttonClasses(variant, 'w-full')}>
      <span aria-hidden="true">☎</span>
      {label}
      <span className="font-normal">{formatPhone(phone)}</span>
    </a>
  );
}
