/**
 * `npm run demo:reset` — resets DATABASE_URL to the demo state. DESTROYS all data in that database.
 */
import { env } from '@/shared/env';
import { resetDemo } from './reset-demo';

const summary = await resetDemo(env.DATABASE_URL);
console.log('Demo data reset.', JSON.stringify(summary));
process.exit(0);
