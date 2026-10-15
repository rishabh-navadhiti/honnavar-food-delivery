export type ResultError = {
  code: string;
  fieldErrors?: Record<string, string>;
  details?: Record<string, string | number>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ResultError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(
  code: string,
  fieldErrors?: Record<string, string>,
  details?: Record<string, string | number>,
): Result<T> {
  return { ok: false, error: { code, ...(fieldErrors ? { fieldErrors } : {}), ...(details ? { details } : {}) } };
}
