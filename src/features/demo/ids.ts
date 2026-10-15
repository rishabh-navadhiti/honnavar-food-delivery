import { createHash } from 'node:crypto';

/** Fixed namespace for demo ids (any constant UUID works; this one is ours). */
const NAMESPACE = Buffer.from('6f1c2b8e4a3d4c1f9b0e7d5a2c8f3e61', 'hex');

/**
 * A stable UUID (version 5, name-based SHA-1) for a catalogue entry, so reloading the same catalogue
 * gives the same ids and e2e tests can build URLs. Pure: no server-only, importable from e2e/.
 */
export function deterministicId(name: string): string {
  const hash = createHash('sha1').update(NAMESPACE).update(name, 'utf8').digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const demoIds = {
  admin: (key: string) => deterministicId(`admin:${key}`),
  agent: (key: string) => deterministicId(`agent:${key}`),
  customer: (key: string) => deterministicId(`customer:${key}`),
  kitchen: (key: string) => deterministicId(`kitchen:${key}`),
  category: (kitchenKey: string, key: string) => deterministicId(`category:${kitchenKey}/${key}`),
  dish: (kitchenKey: string, key: string) => deterministicId(`dish:${kitchenKey}/${key}`),
  signin: (kitchenKey: string, phone: string) => deterministicId(`signin:${kitchenKey}/${phone}`),
  contact: (kitchenKey: string, phone: string) => deterministicId(`contact:${kitchenKey}/${phone}`),
  address: (customerKey: string, key: string) => deterministicId(`address:${customerKey}/${key}`),
  order: (key: string) => deterministicId(`order:${key}`),
};
