'use client';

import { BellOff, BellRing } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { promptSeenRaw, SOUND_UNLOCK_EVENT, soundWasTurnedOn, subscribeAlertStorage } from './alert-storage';

/**
 * The order-sound prompt once a device has turned sounds on (FR-017, research R9): "Sounds on", or
 * "Tap for sound" when the browser needs a new tap after a reload. A tap asks NewOrderAlert to unlock.
 */
export function SoundPill() {
  const t = useTranslations('alert');
  const seen = useSyncExternalStore(subscribeAlertStorage, promptSeenRaw, () => 'unknown');
  const on = useSyncExternalStore(subscribeAlertStorage, soundWasTurnedOn, () => false);
  const pathname = usePathname();
  if (seen !== 'seen' || pathname.startsWith('/partner/login')) return null;
  return (
    <button
      type="button"
      data-testid="sound-pill"
      data-state={on ? 'on' : 'off'}
      onClick={() => window.dispatchEvent(new Event(SOUND_UNLOCK_EVENT))}
      className="inline-flex min-h-touch shrink-0 items-center"
    >
      <span
        className={`inline-flex h-9 animate-fade-in items-center gap-1.5 rounded-full px-3 text-small font-bold ${
          on ? 'bg-open-soft text-open' : 'bg-warn-soft text-warn'
        }`}
      >
        {on ? <BellRing aria-hidden="true" className="size-4" /> : <BellOff aria-hidden="true" className="size-4" />}
        {on ? t('soundOnPill') : t('tapForSoundPill')}
      </span>
    </button>
  );
}
