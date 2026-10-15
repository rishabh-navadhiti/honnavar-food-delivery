/**
 * Small audio fixtures for integration tests (research R9). Only the container signatures matter to
 * the store, which checks magic bytes and never decodes audio.
 */
function withPadding(head: number[], size = 400): Buffer {
  const bytes = Buffer.alloc(size, 0x2a);
  Buffer.from(head).copy(bytes);
  return bytes;
}

/** A WebM (EBML) clip: starts with 1A 45 DF A3, then a DocType of "webm". */
export const testWebm = (): Buffer =>
  withPadding([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]);
/** An Ogg clip: starts with "OggS". */
export const testOgg = (): Buffer => withPadding([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);
/** An MP4/M4A clip: a box size, then "ftyp" at offset 4. */
export const testMp4 = (): Buffer => withPadding([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]);
