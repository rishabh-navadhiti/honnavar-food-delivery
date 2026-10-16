/** Interface strings by key, so tests can find controls by name in either language. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Locale } from './layout';

const files = {
  en: JSON.parse(readFileSync(path.resolve('src/shared/i18n/messages/en.json'), 'utf8')) as Record<string, Record<string, string>>,
  kn: JSON.parse(readFileSync(path.resolve('src/shared/i18n/messages/kn.json'), 'utf8')) as Record<string, Record<string, string>>,
};

/** The text of `namespace.key`; placeholders such as `{amount}` are cut off at their start. */
export function msg(locale: Locale, key: string): string {
  const [ns, name] = key.split('.') as [string, string];
  const value = files[locale][ns]?.[name];
  if (value === undefined) throw new Error(`No message ${key} in ${locale}`);
  const brace = value.indexOf('{');
  return (brace >= 0 ? value.slice(0, brace) : value).trim();
}
