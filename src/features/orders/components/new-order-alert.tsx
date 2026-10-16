'use client';

import { ArrowRight, BellRing, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { POLL_INTERVAL_MS } from '@/shared/polling/live-refresh';
import { usePolling } from '@/shared/polling/use-polling';
import {
  acknowledgedRaw,
  parseAcknowledged,
  promptSeenRaw,
  rememberPromptSeen,
  rememberSoundOn,
  SOUND_UNLOCK_EVENT,
  soundWasTurnedOn,
  subscribeAlertStorage,
} from './alert-storage';

type FeedOrder = { id: string; orderNo: number };
const REPEAT_MS = 5000;

/**
 * The new-order alert on every partner screen (FR-029, research R10): polls the kitchen's Placed
 * orders, shows a highlighted banner, and repeats a tone every 5 s until each order is opened,
 * accepted, rejected or expired. Browsers need one tap before playing sound, so a prompt asks for it;
 * once a device has done that, the prompt is the compact SoundPill in the top bar instead (FR-017).
 */
export function NewOrderAlert() {
  const t = useTranslations('alert');
  const [orders, setOrders] = useState<FeedOrder[]>([]);
  const ackedRaw = useSyncExternalStore(subscribeAlertStorage, acknowledgedRaw, () => '[]');
  const acked = useMemo(() => parseAcknowledged(ackedRaw), [ackedRaw]);
  const soundOn = useSyncExternalStore(subscribeAlertStorage, soundWasTurnedOn, () => false);
  // Unknown on the server: the prompt or pill appears only once the device's choice is read.
  const seen = useSyncExternalStore(subscribeAlertStorage, promptSeenRaw, () => 'unknown');
  const audio = useRef<HTMLAudioElement | null>(null);

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
  // On the orders list the waiting order is itself the visual alert (first, outlined, counting down),
  // so the banner is not repeated there (003, SC-007); the sound still plays.
  const onOrdersList = usePathname() === '/partner/orders';

  useEffect(() => {
    if (!soundOn || waiting.length === 0) return;
    const play = () => {
      const sound = audio.current;
      if (!sound) return;
      sound.currentTime = 0;
      sound.play().catch(() => {
        // The browser blocked sound (for example after a reload): ask for a tap again.
        rememberSoundOn(false);
      });
    };
    play();
    const timer = setInterval(play, REPEAT_MS);
    return () => clearInterval(timer);
  }, [soundOn, waiting.length]);

  const turnSoundOn = useCallback(async () => {
    const sound = audio.current;
    if (!sound) return;
    try {
      sound.volume = 0;
      await sound.play();
      sound.pause();
      sound.volume = 1;
      rememberSoundOn(true);
      rememberPromptSeen();
    } catch {
      rememberSoundOn(false);
    }
  }, []);

  useEffect(() => {
    const onUnlock = () => void turnSoundOn();
    window.addEventListener(SOUND_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(SOUND_UNLOCK_EVENT, onUnlock);
  }, [turnSoundOn]);

  return (
    <div className="mb-2 flex flex-col gap-2 empty:hidden">
      {soundOn || seen !== 'new' ? null : (
        <button
          type="button"
          onClick={turnSoundOn}
          data-testid="sound-prompt"
          className="flex min-h-touch w-full animate-fade-in items-center gap-3 rounded-lg bg-sea p-4 text-start text-surface shadow-2"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface/15">
            <Volume2 aria-hidden="true" className="size-5" />
          </span>
          <span className="flex-1 text-base font-bold">{t('turnOnSound')}</span>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
        </button>
      )}
      {waiting.length > 0 && !onOrdersList ? (
        <Link
          href={`/partner/orders/${waiting[0]!.id}`}
          role="alert"
          data-testid="new-order-banner"
          className="flex min-h-touch animate-sheet-up items-center gap-3 rounded-lg bg-surface px-4 py-3 text-base font-bold text-ink shadow-[0_0_0_2px_var(--color-ink),var(--shadow-2)]"
        >
          <BellRing aria-hidden="true" className="size-5 shrink-0 text-status-placed" />
          <span className="flex-1">{t('newOrder', { orderNo: String(waiting[0]!.orderNo), count: waiting.length })}</span>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
        </Link>
      ) : null}
    </div>
  );
}
