import { expect, test, type Browser } from '@playwright/test';
import { activeAgents, admin, availableDishesIn, demoCustomer, orderableKitchen } from './catalogue';
import { blockMapTiles, openAllDay } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

const kitchen = orderableKitchen();
const agent = activeAgents()[0]!;
const WITHIN = { timeout: 15_000 };

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(kitchen.id);
});
test.setTimeout(300_000);

async function phone(browser: Browser) {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true })).newPage();
  await blockMapTiles(page);
  return page;
}

test('the demo milestone across four screens: place, accept, assign, prepare, pick up, deliver', async ({ browser }) => {
  const started = Date.now();
  const customer = await phone(browser);
  const partner = await phone(browser);
  const agentPage = await phone(browser);
  const adminPage = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

  // Customer places a cash order and keeps the order page open.
  await signIn(customer, '/login', demoCustomer().phone);
  await customer.goto(`/kitchens/${kitchen.id}`);
  const dishes = availableDishesIn(kitchen.key);
  await customer.locator(`[data-dish-id="${dishes[0]!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await customer.locator(`[data-dish-id="${dishes[1]!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(customer.getByTestId('cart-bar')).toContainText('2 items');
  await customer.getByTestId('cart-bar').click();
  await customer.getByRole('radio', { name: 'Cash on delivery' }).check();
  await customer.getByRole('button', { name: /Place order/ }).click();
  await expect(customer).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, WITHIN);
  const orderNo = (await customer.getByRole('heading', { level: 1 }).textContent())!.match(/#(\d+)/)![1]!;
  const grandTotal = (await customer.getByTestId('bill-grand-total').textContent())!;
  const itemTotal = (await customer.getByTestId('bill-item-total').textContent())!;
  const timeline = customer.getByTestId('timeline');

  // Partner hears and sees it (SC-004), accepts.
  await signIn(partner, '/partner/login', kitchen.signins[0]!.phone);
  await expect(partner.getByTestId('new-order-banner')).toContainText(`#${orderNo}`, WITHIN);
  await partner.getByTestId('new-order-banner').click();
  const card = partner.locator(`[data-order-no="${orderNo}"]`);
  await expect(card).toContainText(itemTotal);
  await card.getByRole('button', { name: 'Accept order' }).click();
  await expect(timeline.locator('[data-step="accepted"]')).toHaveAttribute('data-done', 'true', WITHIN);

  // Admin assigns the first active agent; the board shows the same grand total.
  await signIn(adminPage, '/admin/login', admin().phone);
  const boardCard = adminPage.locator(`[data-testid="board-order"][data-order-no="${orderNo}"]`);
  await expect(boardCard).toContainText(grandTotal, WITHIN);
  await boardCard.locator('select[name="agentId"]').selectOption(agent.id);
  await boardCard.getByRole('button', { name: 'Assign', exact: true }).click();
  await expect(timeline.locator('[data-step="assigned"]')).toHaveAttribute('data-done', 'true', WITHIN);
  await expect(customer.getByTestId('order-agent')).toHaveText(agent.name, WITHIN);

  // Partner prepares; the agent sees "Picked up" become available.
  await card.getByRole('button', { name: 'Start preparing' }).click();
  await expect(timeline.locator('[data-step="preparing"]')).toHaveAttribute('data-done', 'true', WITHIN);
  await signIn(agentPage, '/agent/login', agent.phone);
  await agentPage.locator(`[data-testid="agent-order"][data-order-no="${orderNo}"]`).click();
  await expect(agentPage.getByTestId('still-preparing')).toBeVisible();
  await card.getByRole('button', { name: 'Ready for pickup' }).click();
  await expect(agentPage.getByRole('button', { name: 'Picked up' })).toBeVisible(WITHIN);

  // Agent picks up and delivers, confirming the same grand total in cash (SC-005).
  await agentPage.getByRole('button', { name: 'Picked up' }).click();
  await expect(timeline.locator('[data-step="picked_up"]')).toHaveAttribute('data-done', 'true', WITHIN);
  await agentPage.getByRole('button', { name: 'Delivered' }).click();
  await agentPage.getByRole('button', { name: `Collected ${grandTotal} in cash` }).click();
  await expect(agentPage.getByText('Delivered. Thank you!')).toBeVisible();

  // Every screen reaches the end without a reload (SC-003).
  await expect(timeline.locator('[data-step="delivered"]')).toHaveAttribute('data-done', 'true', WITHIN);
  await expect(adminPage.getByTestId('group-finished')).toContainText(`#${orderNo}`, WITHIN);
  await adminPage.locator(`[data-testid="board-order"][data-order-no="${orderNo}"]`).getByRole('link').click();
  await expect(adminPage.getByTestId('bill-grand-total')).toHaveText(grandTotal);

  expect(Date.now() - started).toBeLessThan(5 * 60_000); // SC-002
});
