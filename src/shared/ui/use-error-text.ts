'use client';

import { useTranslations } from 'next-intl';
import type { ResultError } from '../result';
import { errorKey } from './error-text';

/** Translate a result error: a form-level message, and field messages by name or name prefix. */
export function useErrorText(error: ResultError | undefined) {
  const t = useTranslations('errors');
  const details = error?.details as Record<string, string | number> | undefined;
  return {
    form: error && !error.fieldErrors ? t(errorKey(error.code), details) : undefined,
    field: (...names: string[]): string | undefined => {
      const entries = Object.entries(error?.fieldErrors ?? {});
      for (const name of names) {
        const hit = entries.find(([key]) => key === name || key.startsWith(`${name}.`));
        if (hit) return t(hit[1]);
      }
      return undefined;
    },
  };
}
