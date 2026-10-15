'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { POLL_INTERVAL_MS } from '@/shared/polling/live-refresh';
import { usePolling } from '@/shared/polling/use-polling';
import { buttonClasses } from '@/shared/ui/button';
import { acknowledgedRaw, parseAcknowledged, rememberSoundOn, soundWasTurnedOn, subscribeAlertStorage } from './alert-storage';

type FeedOrder = { id: string; orderNo: number };
const REPEAT_MS = 5000;

/**
 * The new-order alert on every partner screen (FR-029, research R10): polls the kitchen's Placed
 * orders, shows a highlighted banner, and repeats a tone every 5 s until each order is opened,
 * accepted, rejected or expired. Browsers need one tap before playing sound, so a prompt asks for it.
 */
export function NewOrderAlert() {
  const t = useTranslations('alert');
  const [orders, setOrders] = useState<FeedOrder[]>([]);
  const ackedRaw = useSyncExternalStore(subscribeAlertStorage, acknowledgedRaw, () => '[]');
  const acked = useMemo(() => parseAcknowledged(ackedRaw), [ackedRaw]);
  const soundOn = useSyncExternalStore(subscribeAlertStorage, soundWasTurnedOn, () => false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const setSoundOn = (on: boolean) => rememberSoundOn(on);

  useEffect(() => {
    audio.current = new Audio('/sounds/new-order.wav');
  }, []);

  const poll = useCallback(async () => {
    const response = await fetch('/partner/orders/new', { cache: 'no-store' });
    if (!response.ok) return;
    setOrders(((await response.json()) as { orders: FeedOrder[] }).orders);
  }, []);
  usePolling(poll, { intervalMs: POLL_INTERVAL_MS, immediate: true });

  const waiting = orders.filter((o) => !acked.has(o.id));

  useEffect(() => {
    if (!soundOn || waiting.length === 0) return;
    const play = () => {
      const sound = audio.current;
      if (!sound) return;
      sound.currentTime = 0;
      sound.play().catch(() => {
        // The browser blocked sound (for example after a reload): ask for a tap again.
        setSoundOn(false);
      });
    };
    play();
    const timer = setInterval(play, REPEAT_MS);
    return () => clearInterval(timer);
  }, [soundOn, waiting.length]);

  async function turnSoundOn() {
    const sound = audio.current;
    if (!sound) return;
    try {
      sound.volume = 0;
      await sound.play();
      sound.pause();
      sound.volume = 1;
      setSoundOn(true);
    } catch {
      setSoundOn(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {soundOn ? null : (
        <button type="button" onClick={turnSoundOn} className={buttonClasses('secondary', 'w-full border-warn')} data-testid="sound-prompt">
          {t('turnOnSound')}
        </button>
      )}
      {waiting.length > 0 ? (
        <Link
          href={`/partner/orders/${waiting[0]!.id}`}
          role="alert"
          data-testid="new-order-banner"
          className="flex min-h-touch items-center justify-between gap-3 rounded-2xl border-2 border-warn bg-amber-100 px-4 py-3 text-base font-bold text-ink"
        >
          <span>{t('newOrder', { orderNo: String(waiting[0]!.orderNo), count: waiting.length })}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
