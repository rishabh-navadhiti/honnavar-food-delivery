import { resetDemo } from '../src/features/demo/reset-demo';

/** Every e2e spec file calls this in `test.beforeAll`, so files never depend on each other. */
export async function resetDemoData(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for e2e tests (it is reset!).');
  await resetDemo(url);
}
