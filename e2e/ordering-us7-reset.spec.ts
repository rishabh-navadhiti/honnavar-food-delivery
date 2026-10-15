import { expect, test } from '@playwright/test';
import { activeAgents, admin, placedOrder } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('a reset brings the seeded orders back, with the Placed order fresh again', async ({ page }) => {
  const placed = placedOrder();
  await signIn(page, '/partner/login', placed.kitchen.signins[0]!.phone);
  await page.goto(`/partner/orders/${placed.id}`);
  await page.getByRole('button', { name: 'Accept order' }).click();
  await expect(page.locator(`[data-order-no="${placed.orderNo}"]`)).toContainText('Accepted');

  await resetDemoData();

  // The reset also clears sessions, so sign in again.
  await signIn(page, '/partner/login', placed.kitchen.signins[0]!.phone);
  await page.goto('/partner/orders');
  const card = page.locator(`[data-order-no="${placed.orderNo}"]`);
  await expect(card).toContainText('Placed');
  const left = (await card.getByTestId('time-left').textContent())!.match(/(\d+):\d{2}/)!;
  const window = Number(process.env.ACCEPT_WINDOW_MINUTES ?? 10);
  expect(Number(left[1])).toBeGreaterThanOrEqual(window - 2);

  // The demo panels still list the accounts.
  for (const [path, phone] of [
    ['/agent/login', activeAgents()[0]!.phone],
    ['/admin/login', admin().phone],
  ] as const) {
    await page.context().clearCookies();
    await page.goto(path);
    await expect(page.getByTestId('demo-panel').locator(`li[data-phone="${phone}"]`)).toBeVisible();
  }
});
