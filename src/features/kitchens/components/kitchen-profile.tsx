import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { LocalizedText } from '@/shared/ui/localized-text';

type Profile = {
  nameEn: string | null;
  nameKn: string | null;
  descriptionEn: string | null;
  descriptionKn: string | null;
  type: 'restaurant' | 'home_kitchen' | 'cloud_kitchen';
  pureVeg: boolean;
  status: 'pending' | 'active' | 'suspended';
  address: string;
  landmark: string;
};

/** Read-only, admin-managed kitchen details for the partner (FR-038). */
export function KitchenProfile({
  kitchen,
  contacts,
  signins,
}: {
  kitchen: Profile;
  contacts: { phone: string; isPrimary: boolean }[];
  signins: { phone: string; personName: string }[];
}) {
  const t = useTranslations();
  const row = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-small font-semibold text-muted">{label}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
  return (
    <Card>
      <dl className="flex flex-col gap-3">
        {row(t('kitchenProfile.name'), <LocalizedText pair={{ en: kitchen.nameEn, kn: kitchen.nameKn }} />)}
        {row(t('kitchenProfile.description'), <LocalizedText pair={{ en: kitchen.descriptionEn, kn: kitchen.descriptionKn }} />)}
        {row(
          t('kitchenProfile.type'),
          <span className="flex flex-wrap gap-1.5">
            <Badge>{t(`kitchenType.${kitchen.type}`)}</Badge>
            {kitchen.pureVeg ? <Badge tone="veg">{t('veg.pureVeg')}</Badge> : null}
          </span>,
        )}
        {row(t('kitchenProfile.status'), t(`status.${kitchen.status}`))}
        {row(t('kitchenProfile.landmark'), kitchen.landmark)}
        {row(t('kitchenProfile.address'), kitchen.address)}
        {row(
          t('kitchenProfile.contacts'),
          <ul>
            {contacts.map((c) => (
              <li key={c.phone}>
                {formatPhone(c.phone)}
                {c.isPrimary ? <span className="ms-2 text-small text-muted">{t('kitchenProfile.primary')}</span> : null}
              </li>
            ))}
          </ul>,
        )}
        {row(
          t('kitchenProfile.signins'),
          <ul>
            {signins.map((s) => (
              <li key={s.phone}>
                {formatPhone(s.phone)}
                <span className="ms-2 text-small text-muted">{s.personName}</span>
              </li>
            ))}
          </ul>,
        )}
      </dl>
    </Card>
  );
}
