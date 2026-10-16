import { expect, test } from '@playwright/test';
import { deliveredOrder, demoCustomer, placedOrder, readyOrder } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('customers, partners and agents read their updates in a demo message log, in their language', async ({ page }) => {
  // Customer (FR-046, FR-047).
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto('/messages');
  const list = page.getByRole('main').getByTestId('message-list');
  await expect(list).toContainText(`Order #${deliveredOrder().orderNo} delivered.`);
  await expect(list.locator('li').first()).toContainText('Demo: not sent by SMS or WhatsApp');

  // Switching language changes the entries, not just the labels.
  await page.getByRole('button', { name: 'Switch to Kannada' }).click();
  await expect(list).toContainText(`ಆರ್ಡರ್ #${deliveredOrder().orderNo} ತಲುಪಿದೆ.`);
  await expect(list.locator('li').first()).toContainText('ಡೆಮೊ: SMS ಅಥವಾ WhatsApp ಮೂಲಕ ಕಳಿಸಿಲ್ಲ');
  await page.getByRole('button', { name: /English|ಇಂಗ್ಲಿಷ್/ }).click();

  // Partner: the kitchen's new-order message.
  const placed = placedOrder();
  await signIn(page, '/partner/login', placed.kitchen.signins[0]!.phone);
  await page.goto('/partner/messages');
  await expect(page.getByTestId('message-list')).toContainText(`New order #${placed.orderNo}`);

  // Agent: the assignment.
  const ready = readyOrder();
  await signIn(page, '/agent/login', ready.agent!.phone);
  await page.getByRole('link', { name: 'Messages' }).click();
  await expect(page.getByTestId('message-list')).toContainText(`New delivery: order #${ready.orderNo}`);
});
