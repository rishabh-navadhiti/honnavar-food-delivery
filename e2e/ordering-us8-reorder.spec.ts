import { expect, test } from '@playwright/test';
import { deliveredOrder, demoCustomer } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('a customer orders a past order again from "My orders"', async ({ page }) => {
  const past = deliveredOrder();
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto('/orders');
  const card = page.getByTestId('order-card').filter({ hasText: `#${past.orderNo}` });
  await expect(card).toContainText('Delivered');
  await card.locator('..').getByRole('button', { name: 'Order again' }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByTestId('cart-line').first()).toBeVisible();
});
