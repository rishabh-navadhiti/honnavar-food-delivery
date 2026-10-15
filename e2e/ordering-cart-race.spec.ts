import { expect, test } from '@playwright/test';
import { availableDishesIn, demoCustomer, orderableKitchen } from './catalogue';
import { openAllDay } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

const kitchen = orderableKitchen();
const [first, second] = availableDishesIn(kitchen.key);

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(kitchen.id);
});

test('opening the cart while an Add is still saving shows the latest cart, and the order is placed', async ({ page }) => {
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto(`/kitchens/${kitchen.id}`);
  await page.locator(`[data-dish-id="${first!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toContainText('1 item');

  // Slow down the next Add, then open the cart before it finishes (the reviewer's reproduction).
  await page.route(`**/kitchens/${kitchen.id}`, async (route) => {
    if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.locator(`[data-dish-id="${second!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByTestId('cart-bar').click();

  await expect(page).toHaveURL('/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(2);
  const total = first!.priceRupees + second!.priceRupees + 30;
  await expect(page.getByTestId('bill-grand-total')).toHaveText(`₹${total.toLocaleString('en-IN')}`);

  await page.getByRole('radio', { name: 'Cash on delivery' }).check();
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  await expect(page.getByText('₹0')).toHaveCount(0);
});

test('a cart page restored with the browser Forward button re-reads the cart before placing', async ({ page }) => {
  const third = availableDishesIn(kitchen.key)[2]!;
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto('/cart');
  const before = await page.getByTestId('cart-line').count();
  await page.goBack();
  await page.goto(`/kitchens/${kitchen.id}`);
  await page.locator(`[data-dish-id="${third.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toBeVisible();
  await page.goBack();
  await page.goForward();
  await page.goto('/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(before + 1);
  await page.getByRole('radio', { name: 'Cash on delivery' }).check();
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 });
});
