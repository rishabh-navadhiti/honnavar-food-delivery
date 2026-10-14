import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { SelectField, TextField } from '@/shared/ui/field';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { AdminKitchenRow } from '../../queries';

type Filters = { status?: string; type?: string; q?: string };

/** Partner list with status/type filters and name-or-phone search (FR-024). A plain GET form. */
export function PartnerTable({ rows, filters }: { rows: AdminKitchenRow[]; filters: Filters }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="grid items-end gap-3 md:grid-cols-4">
        <SelectField name="status" label={t('admin.filterStatus')} defaultValue={filters.status ?? ''}>
          <option value="">{t('admin.any')}</option>
          {(['pending', 'active', 'suspended'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </SelectField>
        <SelectField name="type" label={t('admin.filterType')} defaultValue={filters.type ?? ''}>
          <option value="">{t('admin.any')}</option>
          {(['restaurant', 'home_kitchen', 'cloud_kitchen'] as const).map((type) => (
            <option key={type} value={type}>
              {t(`kitchenType.${type}`)}
            </option>
          ))}
        </SelectField>
        <TextField name="q" type="search" label={t('admin.search')} defaultValue={filters.q ?? ''} />
        <button type="submit" className={buttonClasses('secondary')}>
          {t('admin.applyFilters')}
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">{t('admin.noResults')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-start text-base">
            <thead className="bg-secondary text-sm">
              <tr>
                <th scope="col" className="px-3 py-2 text-start">{t('admin.colName')}</th>
                <th scope="col" className="px-3 py-2 text-start">{t('admin.colType')}</th>
                <th scope="col" className="px-3 py-2 text-start">{t('admin.colStatus')}</th>
                <th scope="col" className="px-3 py-2 text-start">{t('admin.colPhone')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-t border-line" data-testid="partner-row" data-kitchen-id={k.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/partners/${k.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                      <LocalizedText pair={{ en: k.nameEn, kn: k.nameKn }} />
                    </Link>
                  </td>
                  <td className="px-3 py-2">{t(`kitchenType.${k.type}`)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={k.status === 'active' ? 'open' : k.status === 'suspended' ? 'closed' : 'warn'}>{t(`status.${k.status}`)}</Badge>
                  </td>
                  <td className="px-3 py-2">{k.primaryPhone ? formatPhone(k.primaryPhone) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
