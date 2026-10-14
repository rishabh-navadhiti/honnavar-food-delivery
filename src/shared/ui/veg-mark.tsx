import { useTranslations } from 'next-intl';

/**
 * The Indian veg / non-veg food symbol (a dot in a square) plus a text label,
 * so colour is never the only signal (Principle IV).
 */
export function VegMark({ isVeg, showLabel = true }: { isVeg: boolean; showLabel?: boolean }) {
  const t = useTranslations('veg');
  const label = isVeg ? t('veg') : t('nonVeg');
  const colour = isVeg ? 'border-veg text-veg' : 'border-nonveg text-nonveg';
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${colour}`}>
      <span aria-hidden="true" className={`inline-flex size-4 items-center justify-center border-2 ${colour}`}>
        {isVeg ? (
          <span className="size-2 rounded-full bg-veg" />
        ) : (
          <span className="size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-nonveg" />
        )}
      </span>
      {showLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
