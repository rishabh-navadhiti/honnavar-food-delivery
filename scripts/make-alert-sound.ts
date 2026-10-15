/**
 * Writes public/sounds/new-order.wav: the partner's new-order alert (research R10).
 * A self-generated two-tone beep, so there are no licence questions. Run once with
 * `npx tsx scripts/make-alert-sound.ts` and commit the output.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 8000;
const TONES = [
  { hz: 880, ms: 220 },
  { hz: 0, ms: 60 },
  { hz: 1320, ms: 220 },
  { hz: 0, ms: 60 },
  { hz: 880, ms: 220 },
  { hz: 0, ms: 60 },
  { hz: 1320, ms: 220 },
];
const VOLUME = 0.8;
const FADE_SAMPLES = 80; // 10 ms fade in and out per tone, to avoid clicks

const samples: number[] = [];
for (const tone of TONES) {
  const count = Math.round((SAMPLE_RATE * tone.ms) / 1000);
  for (let i = 0; i < count; i += 1) {
    if (tone.hz === 0) {
      samples.push(0);
      continue;
    }
    const fade = Math.min(1, i / FADE_SAMPLES, (count - i) / FADE_SAMPLES);
    const t = i / SAMPLE_RATE;
    // A little third harmonic makes the beep cut through on small phone speakers.
    const value = Math.sin(2 * Math.PI * tone.hz * t) + 0.3 * Math.sin(2 * Math.PI * 3 * tone.hz * t);
    samples.push((value / 1.3) * VOLUME * fade);
  }
}

const data = Buffer.alloc(samples.length * 2);
samples.forEach((s, i) => data.writeInt16LE(Math.round(s * 32767), i * 2));

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const out = path.resolve('public/sounds/new-order.wav');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
console.log(`Wrote ${out} (${header.length + data.length} bytes)`);
