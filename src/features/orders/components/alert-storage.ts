/** Per-tab memory for the new-order alert (research R10). Every access is guarded: storage can be blocked. */
const ACK_KEY = 'hfd_alert_acknowledged';
const UNLOCK_KEY = 'hfd_alert_sound_on';
export const ALERT_STORAGE_EVENT = 'hfd-alert-storage';

/** The raw acknowledged list, a stable string for useSyncExternalStore. */
export function acknowledgedRaw(): string {
  try {
    return sessionStorage.getItem(ACK_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

export function parseAcknowledged(raw: string): Set<string> {
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function acknowledgedIds(): Set<string> {
  return parseAcknowledged(acknowledgedRaw());
}

export function subscribeAlertStorage(onChange: () => void): () => void {
  window.addEventListener(ALERT_STORAGE_EVENT, onChange);
  return () => window.removeEventListener(ALERT_STORAGE_EVENT, onChange);
}

export function acknowledge(orderId: string): void {
  try {
    const ids = acknowledgedIds();
    ids.add(orderId);
    sessionStorage.setItem(ACK_KEY, JSON.stringify([...ids].slice(-200)));
    window.dispatchEvent(new Event(ALERT_STORAGE_EVENT));
  } catch {
    // Without storage the alert simply keeps showing until the order leaves the feed.
  }
}

export function soundWasTurnedOn(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberSoundOn(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(UNLOCK_KEY, '1');
    else sessionStorage.removeItem(UNLOCK_KEY);
    window.dispatchEvent(new Event(ALERT_STORAGE_EVENT));
  } catch {
    // Not remembered; the prompt shows again on the next page.
  }
}

const PROMPT_SEEN_KEY = 'hfd_alert_prompt_seen';

/**
 * Whether this device has turned order sounds on before (003, research R9): then the prompt shows
 * as a compact pill. Stored in localStorage (device), while the unlock itself stays per tab.
 */
export function promptSeenRaw(): string {
  try {
    return localStorage.getItem(PROMPT_SEEN_KEY) === '1' ? 'seen' : 'new';
  } catch {
    return 'new';
  }
}

export function rememberPromptSeen(): void {
  try {
    localStorage.setItem(PROMPT_SEEN_KEY, '1');
    window.dispatchEvent(new Event(ALERT_STORAGE_EVENT));
  } catch {
    // Not remembered; the full prompt shows again next time.
  }
}

/** The pill asks the alert to unlock sound; the alert owns the audio element. */
export const SOUND_UNLOCK_EVENT = 'hfd-sound-unlock';
