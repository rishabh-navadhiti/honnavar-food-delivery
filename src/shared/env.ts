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
  // Ordering settings (002 research R12). Each order copies the fee and expected time when placed.
  DELIVERY_FEE_RUPEES: z.coerce.number().int().min(0).max(500).default(30),
  DELIVERY_MINUTES: z.coerce.number().int().min(1).max(180).default(15),
  ACCEPT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(120).default(10),
  GEOCODING_PROVIDER: z.enum(['nominatim', 'stand-in']).default('nominatim'),
  NOMINATIM_BASE_URL: z.url().default('https://nominatim.openstreetmap.org'),
  GEOCODING_CONTACT: z.string().min(1).default('https://github.com/rishabh-navadhiti/honnavar-food-delivery'),
  MAP_TILE_URL: z
    .string()
    .refine((v) => ['{z}', '{x}', '{y}'].every((p) => v.includes(p)), 'must contain {z}, {x} and {y}')
    .default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  MAP_TILE_ATTRIBUTION: z.string().min(1).default('© OpenStreetMap contributors'),
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
