'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';

export const MAX_RECORDING_SECONDS = 30;
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

type State =
  | { kind: 'idle' }
  | { kind: 'recording'; secondsLeft: number }
  | { kind: 'recorded'; url: string }
  | { kind: 'unavailable' };

/**
 * The optional landmark voice note (FR-055), a declared stand-in: recorded on the phone, stored as
 * recorded and never transcribed. The recording goes into the form's `voiceNote` file field, so it
 * is sent with the address. An existing note can be played, replaced or removed.
 */
export function VoiceRecorder({ existingUrl }: { existingUrl?: string | null }) {
  const t = useTranslations('voiceNote');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [removeExisting, setRemoveExisting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  function clearFile() {
    if (fileInput.current) fileInput.current.value = '';
  }

  async function start() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState({ kind: 'unavailable' });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState({ kind: 'unavailable' });
      return;
    }
    const mimeType = PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (timer.current) clearInterval(timer.current);
      const type = (media.mimeType || mimeType || 'audio/webm').split(';')[0]!;
      const blob = new Blob(chunks, { type });
      const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], `landmark.${extension}`, { type }));
      if (fileInput.current) fileInput.current.files = transfer.files;
      setState({ kind: 'recorded', url: URL.createObjectURL(blob) });
    };
    recorder.current = media;
    media.start();
    setState({ kind: 'recording', secondsLeft: MAX_RECORDING_SECONDS });
    let left = MAX_RECORDING_SECONDS;
    timer.current = setInterval(() => {
      left -= 1;
      if (left <= 0) stop();
      else setState({ kind: 'recording', secondsLeft: left });
    }, 1000);
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  function discard() {
    clearFile();
    setState({ kind: 'idle' });
  }

  const showExisting = existingUrl && !removeExisting && state.kind !== 'recorded';

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
      <legend className="px-1 text-small font-semibold">{t('title')}</legend>
      <p className="text-small text-muted">{t('hint', { seconds: MAX_RECORDING_SECONDS })}</p>
      <input ref={fileInput} type="file" name="voiceNote" accept="audio/*" className="hidden" tabIndex={-1} aria-hidden="true" />
      <input type="hidden" name="removeVoiceNote" value={removeExisting && state.kind !== 'recorded' ? 'on' : ''} />

      {showExisting ? (
        <div className="flex flex-col gap-2">
          <audio controls preload="none" src={existingUrl} aria-label={t('playSaved')} className="w-full" />
          <button type="button" onClick={() => setRemoveExisting(true)} className={buttonClasses('secondary')}>
            {t('delete')}
          </button>
        </div>
      ) : null}

      {state.kind === 'unavailable' ? (
        <p role="status" className="text-small font-medium text-warn">
          {t('unavailable')}
        </p>
      ) : null}

      {state.kind === 'recording' ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-danger" aria-live="polite">
            {t('recording', { seconds: state.secondsLeft })}
          </span>
          <button type="button" onClick={stop} className={buttonClasses('danger')}>
            {t('stop')}
          </button>
        </div>
      ) : null}

      {state.kind === 'recorded' ? (
        <div className="flex flex-col gap-2">
          <audio controls src={state.url} aria-label={t('playRecording')} className="w-full" data-testid="voice-preview" />
          <div className="flex gap-2">
            <button type="button" onClick={start} className={buttonClasses('secondary', 'flex-1')}>
              {t('reRecord')}
            </button>
            <button type="button" onClick={discard} className={buttonClasses('secondary', 'flex-1')}>
              {t('delete')}
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === 'idle' ? (
        <button type="button" onClick={start} className={buttonClasses('secondary')}>
          {showExisting ? t('recordNew') : t('record')}
        </button>
      ) : null}
    </fieldset>
  );
}
