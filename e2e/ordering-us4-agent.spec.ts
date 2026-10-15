import { expect, test } from '@playwright/test';
import { deliveredOrder, readyOrder } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('an agent opens both locations in maps, picks up, delivers and collects cash', async ({ page }) => {
  const ready = readyOrder();
  const agent = ready.agent!;
  await signIn(page, '/agent/login', agent.phone);

  // Today's totals (FR-044). The seeded cash delivery counts as today's except just after IST
  // midnight (documented reset edge), so compare before and after rather than fixing a number.
  expect(deliveredOrder().agent!.id).toBe(agent.id);
  await expect(page.getByTestId('today-deliveries')).toBeVisible();
  const deliveriesBefore = Number(await page.getByTestId('today-deliveries').textContent());
  const cashBefore = await page.getByTestId('today-cash').textContent();

  // The Ready order is listed; its page has calls and two map links (FR-040, FR-041).
  await page.locator(`[data-testid="agent-order"][data-order-no="${ready.orderNo}"]`).click();
  await expect(page).toHaveURL(`/agent/orders/${ready.id}`);
  await expect(page.getByRole('link', { name: /Call kitchen/ })).toHaveAttribute('href', /^tel:\+91\d{10}$/);
  await expect(page.getByRole('link', { name: /Call customer/ })).toHaveAttribute('href', /^tel:\+91\d{10}$/);
  await expect(page.getByTestId('maps-kitchen')).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\//);
  await expect(page.getByTestId('maps-delivery')).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);

  // Picked up, then delivered with the cash confirmation (FR-042, FR-043).
  await page.getByRole('button', { name: 'Picked up' }).click();
  await expect(page.getByRole('button', { name: 'Delivered' })).toBeVisible();
  await page.getByRole('button', { name: 'Delivered' }).click();
  const confirm = page.getByRole('button', { name: /^Collected ₹[\d,]+ in cash$/ });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.getByText('Delivered. Thank you!')).toBeVisible();

  await page.getByRole('link', { name: 'My deliveries' }).click();
  await expect(page.getByTestId('today-deliveries')).toHaveText(String(deliveriesBefore + 1));
  await expect(page.getByTestId('today-cash')).not.toHaveText(cashBefore!);
});
