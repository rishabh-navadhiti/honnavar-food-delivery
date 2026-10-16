'use client';

import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Counts down the time left to accept a Placed order (FR-020), from the server's deadline. Never negative.
 */
export function TimeLeft({ deadline }: { deadline: string }) {
  const t = useTranslations('partnerOrders');
  const end = new Date(deadline).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(timer);
  }, [end]);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  return (
    <span className="inline-flex items-center gap-1.5 text-small font-bold text-warn" data-testid="time-left">
      <Timer aria-hidden="true" className="size-4 shrink-0" />
      {t('timeLeft', { time: `${minutes}:${String(seconds).padStart(2, '0')}` })}
    </span>
  );
}
