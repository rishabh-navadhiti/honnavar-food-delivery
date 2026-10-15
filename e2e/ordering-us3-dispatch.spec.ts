import { expect, test } from '@playwright/test';
import { activeAgents, admin, deliveredOrder, needsAgentOrder, placedOrder, readyOrder } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('an admin assigns, reassigns and cancels from the dispatch board', async ({ page }) => {
  const [first, second] = activeAgents();
  const needsAgent = needsAgentOrder();
  const placed = placedOrder();

  await signIn(page, '/admin/login', admin().phone);
  await expect(page).toHaveURL('/admin/orders');
  await expect(page.getByTestId('group-needs_agent')).toContainText(`#${needsAgent.orderNo}`);
  await expect(page.getByTestId('group-waiting_kitchen')).toContainText(`#${placed.orderNo}`);

  // Assign the first active agent (FR-034).
  const card = page.locator(`[data-testid="board-order"][data-order-no="${needsAgent.orderNo}"]`);
  await card.locator('select[name="agentId"]').selectOption(first!.id);
  await card.getByRole('button', { name: 'Assign', exact: true }).click();
  const assigned = page.getByTestId('group-assigned').locator(`[data-order-no="${needsAgent.orderNo}"]`);
  await expect(assigned).toContainText(`Agent: ${first!.name}`);

  // Reassign to the second; the history records both (FR-018).
  await assigned.locator('select[name="agentId"]').selectOption(second!.id);
  await assigned.getByRole('button', { name: 'Reassign' }).click();
  await expect(page.getByTestId('group-assigned').locator(`[data-order-no="${needsAgent.orderNo}"]`)).toContainText(`Agent: ${second!.name}`);
  await page.getByTestId('group-assigned').getByRole('link', { name: `#${needsAgent.orderNo}` }).click();
  const history = page.getByTestId('order-history');
  await expect(history).toContainText('Delivery agent assigned');
  await expect(history).toContainText('Delivery agent changed');
  await expect(history).toContainText(`${first!.name} → ${second!.name}`);

  // Cancel the Placed order with "Other" and a note (FR-035, FR-019).
  await page.goto(`/admin/orders/${placed.id}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  const cancel = page.getByTestId('cancel-form');
  await cancel.getByRole('radio', { name: 'Other' }).check();
  await cancel.getByLabel('Short note').fill('Customer called to cancel');
  await cancel.getByRole('button', { name: 'Cancel this order' }).click();
  await expect(page.getByRole('heading', { level: 1 }).locator('..')).toContainText('Cancelled');
  await page.goto('/admin/orders');
  await expect(page.getByTestId('group-finished')).toContainText(`#${placed.orderNo}`);

  // An agent holding an order cannot be deactivated (FR-036).
  const holder = readyOrder().agent!;
  await page.goto('/admin/agents');
  await page.locator(`[data-testid="agent-row"][data-phone="${holder.phone}"]`).getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByTestId('agent-refused')).toContainText(`#${readyOrder().orderNo}`);

  // Find any order by its number.
  await page.goto('/admin/orders');
  await page.getByLabel('Find order by number').fill(String(deliveredOrder().orderNo));
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await expect(page).toHaveURL(`/admin/orders/${deliveredOrder().id}`);
});
