import { useTranslations } from 'next-intl';

/** "#1042": the short number people read out over the phone (research R6). Passed as text so ICU adds no digit grouping. */
export function OrderNumber({ orderNo, className }: { orderNo: number; className?: string }) {
  const t = useTranslations('orders');
  return <span className={`font-mono font-semibold ${className ?? ''}`}>{t('number', { orderNo: String(orderNo) })}</span>;
}
