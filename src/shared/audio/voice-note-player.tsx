import { useTranslations } from 'next-intl';

/** Plays a saved landmark voice note (FR-055). The route only serves it to people allowed to hear it. */
export function VoiceNotePlayer({ voiceNoteId }: { voiceNoteId: string }) {
  const t = useTranslations('voiceNote');
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-muted">{t('landmarkNote')}</p>
      <audio controls preload="none" src={`/voice-notes/${voiceNoteId}`} aria-label={t('playSaved')} className="w-full" />
      <p className="text-xs text-muted">{t('notTranscribed')}</p>
    </div>
  );
}
