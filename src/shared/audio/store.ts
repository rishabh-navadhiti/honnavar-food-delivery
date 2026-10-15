import 'server-only';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db, type Executor } from '../db/client';
import { audioClips } from '../db/schema';
import { err, ok, type Result } from '../result';

/** 30 s of Opus is about 120 KB and of AAC about 240 KB; 600 KB leaves room (research R9). */
export const MAX_AUDIO_BYTES = 600 * 1024;

const SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'audio/webm': (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  'audio/ogg': (b) => b.subarray(0, 4).toString('latin1') === 'OggS',
  'audio/mp4': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
};

/** "audio/webm;codecs=opus" → "audio/webm". */
export function baseMime(mime: string): string {
  return mime.split(';')[0]!.trim().toLowerCase();
}

/**
 * Store a landmark voice note as recorded: no transcoding, no transcription (declared stand-in,
 * FR-055). Validates size, type and magic bytes (Principle V). Identical bytes reuse the row.
 */
export async function storeAudio(bytes: Buffer, mime: string, executor: Executor = db): Promise<Result<{ id: string }>> {
  const type = baseMime(mime);
  const matches = SIGNATURES[type];
  if (!matches || bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES || !matches(bytes)) {
    return err('invalid_audio');
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  await executor
    .insert(audioClips)
    .values({ sha256, mime: type, bytes, byteSize: bytes.byteLength })
    .onConflictDoNothing({ target: audioClips.sha256 });
  const [row] = await executor.select({ id: audioClips.id }).from(audioClips).where(eq(audioClips.sha256, sha256));
  return row ? ok({ id: row.id }) : err('unexpected');
}

export async function readAudio(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const [row] = await db.select({ mime: audioClips.mime, bytes: audioClips.bytes }).from(audioClips).where(eq(audioClips.id, id));
  return row ?? null;
}

/** Delete a clip when no saved address and no order snapshot refers to it any more. */
export async function deleteAudioIfUnused(id: string, executor: Executor = db): Promise<void> {
  await executor.execute(sql`
    delete from audio_clips
    where id = ${id}
      and not exists (select 1 from customer_addresses where voice_note_id = ${id})
      and not exists (select 1 from orders where addr_voice_note_id = ${id})
  `);
}
