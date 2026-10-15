import { expect, test } from '@playwright/test';
import { availableDishesIn, demoCustomer, orderableKitchen, placedOrder, rejectedOrder } from './catalogue';
import { blockMapTiles, openAllDay } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(orderableKitchen().id);
});

test('a customer watches the order move without reloading, on a timeline and a static map', async ({ page, browser }) => {
  const order = placedOrder();
  await blockMapTiles(page);
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto(`/orders/${order.id}`);
  const timeline = page.getByTestId('timeline');
  await expect(timeline.locator('[data-step="placed"]')).toHaveAttribute('data-done', 'true');
  await expect(timeline.locator('[data-step="accepted"]')).toHaveAttribute('data-done', 'false');

  // The static map has a kitchen marker and a delivery marker (FR-026).
  await expect(page.getByRole('img', { name: /^Kitchen: / })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Your delivery location' })).toBeVisible();

  // The partner accepts in another browser; the customer sees it within 15 s without reloading (FR-022).
  const partnerContext = await browser.newContext();
  const partner = await partnerContext.newPage();
  await signIn(partner, '/partner/login', order.kitchen.signins[0]!.phone);
  await partner.goto(`/partner/orders/${order.id}`);
  await partner.getByRole('button', { name: 'Accept order' }).click();
  await expect(partner.getByText('Accepted').first()).toBeVisible();
  await partnerContext.close();

  await expect(timeline.locator('[data-step="accepted"]')).toHaveAttribute('data-done', 'true', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);

  // A rejected order shows its reason; a UPI one says nothing was charged (FR-023).
  const rejected = rejectedOrder();
  await page.goto(`/orders/${rejected.id}`);
  await expect(page.getByTestId('timeline')).toContainText('Kitchen too busy');
  if (rejected.payment === 'upi_demo') await expect(page.getByTestId('nothing-charged')).toBeVisible();
});

test('a customer cancels an order before the kitchen accepts it', async ({ page }) => {
  const kitchen = orderableKitchen();
  await blockMapTiles(page);
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto(`/kitchens/${kitchen.id}`);
  await page.locator(`[data-dish-id="${availableDishesIn(kitchen.key)[0]!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByTestId('cart-bar').click();
  await page.getByRole('radio', { name: 'Cash on delivery' }).check();
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 });

  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Yes, cancel it' }).click();
  await expect(page.getByTestId('timeline').locator('[data-step="cancelled"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
});
