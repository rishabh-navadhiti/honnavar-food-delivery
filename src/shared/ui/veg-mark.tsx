import { useTranslations } from 'next-intl';
import { NonVegMarkIcon, VegMarkIcon } from './icons/veg-marks';

/**
 * The Indian veg / non-veg food symbol plus a text label, so colour is never the only signal
 * (Principle IV). With `showLabel={false}` the label is kept for screen readers.
 */
export function VegMark({ isVeg, showLabel = true }: { isVeg: boolean; showLabel?: boolean }) {
  const t = useTranslations('veg');
  const label = isVeg ? t('veg') : t('nonVeg');
  return (
    <span className={`inline-flex items-center gap-1.5 text-caption font-semibold ${isVeg ? 'text-veg' : 'text-nonveg'}`}>
      {isVeg ? <VegMarkIcon /> : <NonVegMarkIcon />}
      {showLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
