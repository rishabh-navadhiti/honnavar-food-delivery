import { z } from 'zod';
import { err, ok, type Result } from './result';

/**
 * Parse untrusted input (Principle V: fail closed). Schemas use message keys from the `errors`
 * namespace as their error messages; the first problem per field becomes a field error.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): Result<z.infer<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.map(String).join('.') || '_form';
    if (!fieldErrors[field]) fieldErrors[field] = messageKey(issue.message);
  }
  return err('invalid', fieldErrors);
}

/** Zod's own messages (e.g. for a wrong type) collapse to the generic "invalid" key. */
function messageKey(message: string): string {
  return /^[a-zA-Z]+$/.test(message) ? message : 'invalid';
}

/** Common field schemas, with error-message keys. */
export const fields = {
  requiredText: (max: number) =>
    z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(max, { error: 'tooLong' }),
  optionalText: (max: number) =>
    z
      .string()
      .trim()
      .max(max, { error: 'tooLong' })
      .optional()
      .transform((v) => (v ? v : undefined)),
};
