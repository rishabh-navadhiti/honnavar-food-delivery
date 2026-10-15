import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  TEST_DATABASE_URL: z.url().optional(),
  DEFAULT_LOCALE: z.enum(['en', 'kn']).default('en'),
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DEMO_OTP_CODE: z
    .string()
    .regex(/^\d{6}$/, 'must be exactly 6 digits')
    .default('123456'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    // Fail closed: the app must not start with a missing or malformed setting.
    throw new Error(`Invalid environment configuration. ${problems}. See .env.example.`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
