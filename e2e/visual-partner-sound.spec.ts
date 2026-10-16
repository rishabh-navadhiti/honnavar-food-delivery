/**
 * The order-sound prompt collapses to a pill once sound is turned on, remembered on the device
 * (003, FR-017, research R9).
 */
import { expect, test } from '@playwright/test';
import { placedOrder } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(async () => {
  await resetDemoData();
});

test.use({ viewport: { width: 390, height: 844 } });

test('first visit shows the prompt; after one tap a pill, also after a reload; a new device asks again (FR-017)', async ({ page, browser }) => {
  const phone = placedOrder().kitchen.signins[0]!.phone;
  await signIn(page, '/partner/login', phone);
  await page.goto('/partner/orders');
  await expect(page.getByTestId('sound-prompt')).toBeVisible();
  await expect(page.getByTestId('sound-pill')).toHaveCount(0);

  await page.getByTestId('sound-prompt').click();
  await expect(page.getByTestId('sound-prompt')).toBeHidden();
  await expect(page.getByTestId('sound-pill')).toHaveAttribute('data-state', 'on');

  await page.reload();
  await expect(page.getByTestId('sound-pill')).toBeVisible();
  await expect(page.getByTestId('sound-prompt')).toHaveCount(0);

  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fresh = await other.newPage();
  await signIn(fresh, '/partner/login', phone);
  await fresh.goto('/partner/orders');
  await expect(fresh.getByTestId('sound-prompt')).toBeVisible();
  await other.close();
});
