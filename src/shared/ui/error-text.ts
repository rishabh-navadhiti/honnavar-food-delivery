import type { ResultError } from '../result';

/** Map a result error code (snake_case) to its key in the `errors` namespace (camelCase). */
export function errorKey(code: string): string {
  return code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** The form-level message key for an error, or null. */
export function formErrorKey(error: ResultError | undefined): string | null {
  if (!error) return null;
  return errorKey(error.code);
}
