import { expect, test } from '@playwright/test';
import { availableDishesIn, demoCustomer, orderableKitchen, placedOrder } from './catalogue';
import { blockMapTiles, openAllDay } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(orderableKitchen().id);
});

test('signed-in customers see their current order in a strip on every screen but its own page', async ({ page }) => {
  await blockMapTiles(page);
  const latest = placedOrder(); // the seeded order placed most recently (at reset time)
  await signIn(page, '/login', demoCustomer().phone);

  for (const path of ['/', '/cart', '/orders', '/messages', '/addresses', '/account']) {
    await page.goto(path);
    await expect(page.getByTestId('ongoing-strip'), path).toContainText(`#${latest.orderNo}`);
  }

  // Above the cart bar when both show.
  const kitchen = orderableKitchen();
  await page.goto(`/kitchens/${kitchen.id}`);
  await page.locator(`[data-dish-id="${availableDishesIn(kitchen.key)[0]!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toBeVisible();
  const strip = await page.getByTestId('ongoing-strip').boundingBox();
  const bar = await page.getByTestId('cart-bar').boundingBox();
  expect(strip!.y + strip!.height).toBeLessThanOrEqual(bar!.y);

  // Back links go to fixed parents, never history: the cart back to its kitchen.
  await page.getByTestId('cart-bar').click();
  await expect(page.getByTestId('back-link')).toHaveAttribute('href', `/kitchens/${kitchen.id}`);
  await page.getByTestId('back-link').click();
  await expect(page).toHaveURL(`/kitchens/${kitchen.id}`);

  // It opens the order, and is not shown on that order's own page.
  await page.getByTestId('ongoing-strip').click();
  await expect(page).toHaveURL(`/orders/${latest.id}`);
  await expect(page.getByTestId('ongoing-strip')).toHaveCount(0);
  await expect(page.getByTestId('back-link')).toHaveAttribute('href', '/orders');
});
