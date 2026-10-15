import { expect, test } from '@playwright/test';
import { availableDishesIn, demoCustomer, placedOrder } from './catalogue';
import { openAllDay } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

const seeded = placedOrder();
const kitchen = seeded.kitchen;
const partnerPhone = kitchen.signins[0]!.phone;

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(kitchen.id);
});

test('a partner hears and handles new orders, rejects one with a reason, and sees the day', async ({ page, browser }) => {
  await signIn(page, '/partner/login', partnerPhone);

  // The alert asks for one tap to allow sound, and highlights the waiting order (FR-029).
  await page.getByTestId('sound-prompt').click();
  await expect(page.getByTestId('sound-prompt')).toBeHidden();
  await expect(page.getByTestId('new-order-banner')).toContainText(`#${seeded.orderNo}`);

  // Accept, start preparing, ready (FR-030), with time left shown while Placed (FR-020).
  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  const card = page.locator(`[data-order-no="${seeded.orderNo}"]`);
  await expect(card.getByTestId('time-left')).toBeVisible();
  await card.getByRole('button', { name: 'Accept order' }).click();
  await expect(card).toContainText('Accepted');
  await card.getByRole('button', { name: 'Start preparing' }).click();
  await expect(card).toContainText('Preparing');
  await card.getByRole('button', { name: 'Ready for pickup' }).click();
  await expect(card).toContainText('Waiting for the delivery agent');
  await expect(page.getByTestId('new-order-banner')).toBeHidden();

  // A customer places a second order; the partner, on the menu screen, sees it within 15 s.
  const customerContext = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const customer = await customerContext.newPage();
  await signIn(customer, '/login', demoCustomer().phone);
  await customer.goto(`/kitchens/${kitchen.id}`);
  const dish = availableDishesIn(kitchen.key)[0]!;
  await customer.locator(`[data-dish-id="${dish.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await customer.getByTestId('cart-bar').click();
  await customer.getByRole('radio', { name: 'Cash on delivery' }).check();
  await customer.getByRole('button', { name: /Place order/ }).click();
  await expect(customer).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const newNo = (await customer.getByRole('heading', { level: 1 }).textContent())!.match(/#(\d+)/)![1]!;
  await customerContext.close();

  await page.getByRole('link', { name: 'Menu', exact: true }).click();
  const banner = page.getByTestId('new-order-banner');
  await expect(banner).toContainText(`#${newNo}`, { timeout: 15_000 });

  // Open it and reject with a reason (FR-019).
  await banner.click();
  const second = page.locator(`[data-order-no="${newNo}"]`);
  await second.getByRole('button', { name: 'Reject', exact: true }).click();
  await second.getByRole('radio', { name: 'Kitchen too busy' }).check();
  await second.getByRole('button', { name: 'Reject order' }).click();
  await expect(second).toContainText('Rejected');
  await expect(second).toContainText('Kitchen too busy');

  // The day view counts both (FR-031).
  await page.goto('/partner/day');
  expect(Number(await page.getByTestId('day-received').textContent())).toBeGreaterThanOrEqual(2);
  expect(Number(await page.getByTestId('day-rejected').textContent())).toBeGreaterThanOrEqual(1);
});
