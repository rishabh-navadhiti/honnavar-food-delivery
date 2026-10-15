import { expect, test } from '@playwright/test';
import { activeKitchens, admin, availableDishIn, kitchenWithHelper } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('an admin onboards, verifies, activates and suspends a kitchen', async ({ page, browser }) => {
  await signIn(page, '/admin/login', admin().phone);
  // Since 002 the admin home is the dispatch board; partners are one link away.
  await expect(page).toHaveURL('/admin/orders');
  await page.goto('/admin/partners');

  await page.getByRole('link', { name: 'Add partner' }).click();
  await page.getByLabel('Kitchen name in English').fill('E2E Test Kitchen');
  await page.getByLabel('Kitchen name in Kannada').fill('ಪರೀಕ್ಷಾ ಅಡುಗೆ');
  await page.getByLabel('Kitchen type').selectOption('home_kitchen');
  await page.getByLabel('Landmark').fill('Near the e2e temple');
  await page.getByLabel('Address').fill('Test Road, Honnavar');
  await page.getByLabel('Phone 1').fill('9000008001');
  await page.getByLabel('Sign-in number 1').fill('9000008101');
  await page.getByLabel('Person’s name 1').fill('Test Owner');
  await page.getByRole('button', { name: 'Create partner' }).click();
  await expect(page).toHaveURL(/\/admin\/partners\/[0-9a-f-]{36}\?created=1/);
  const kitchenId = /partners\/([0-9a-f-]{36})/.exec(page.url())![1]!;
  const status = page.getByTestId('status-panel');
  await expect(status).toContainText('Pending verification');

  // Activation needs verification first (FR-022).
  await status.getByRole('button', { name: 'Activate' }).click();
  await expect(status.getByRole('alert')).toContainText('Record verification before activating');
  const verification = page.getByTestId('verification-panel');
  await verification.getByLabel('Hygiene check reference').fill('HC-E2E-001');
  await verification.getByRole('button', { name: 'Record verification' }).click();
  await expect(verification).toContainText('not checked with FSSAI');
  await status.getByRole('button', { name: 'Activate' }).click();
  await expect(status).toContainText('Active');

  const customer = await browser.newPage();
  await customer.goto('/');
  await expect(customer.locator(`[data-kitchen-id="${kitchenId}"]`)).toBeVisible();

  // Suspended kitchens disappear; their link shows not found.
  await status.getByLabel('Reason for suspension').fill('E2E check');
  await status.getByRole('button', { name: 'Suspend' }).click();
  await expect(status).toContainText('Suspended');
  await customer.goto(`/kitchens/${kitchenId}`);
  await expect(customer.getByText('Page not found')).toBeVisible();
  await customer.close();
});

test('an admin registers an agent who can then sign in', async ({ page, browser }) => {
  await signIn(page, '/admin/login', admin().phone);
  await page.goto('/admin/agents/new');
  await page.getByLabel('Name').fill('E2E Agent');
  await page.getByLabel('Mobile number').fill('9000008201');
  await page.getByLabel('Vehicle', { exact: true }).selectOption('bicycle');
  await page.getByRole('button', { name: 'Save agent' }).click();
  await expect(page).toHaveURL('/admin/agents');
  await expect(page.locator('[data-testid="agent-row"][data-phone="9000008201"]')).toBeVisible();

  const agentPage = await browser.newPage();
  await signIn(agentPage, '/agent/login', '9000008201');
  await expect(agentPage.getByText('No deliveries yet')).toBeVisible();
  await agentPage.close();
});

test('removing a helper’s number ends their partner session', async ({ page, browser }) => {
  const { kitchen, helperPhone } = kitchenWithHelper();
  const helper = await browser.newPage();
  await signIn(helper, '/partner/login', helperPhone);
  await expect(helper).toHaveURL('/partner');

  await signIn(page, '/admin/login', admin().phone);
  await page.goto(`/admin/partners/${kitchen.id}`);
  const list = page.getByTestId('signin-list');
  await list.locator(`li[data-phone="${helperPhone}"]`).getByRole('button').click();
  await expect(list.locator(`li[data-phone="${helperPhone}"]`)).toHaveCount(0);

  await helper.goto('/partner/menu');
  await expect(helper).toHaveURL('/partner/login');
  await helper.close();
});

test('an admin edits a dish on a partner’s behalf and is recorded as the last change', async ({ page }) => {
  const kitchen = activeKitchens().find((k) => k.key !== kitchenWithHelper().kitchen.key)!;
  const dish = availableDishIn(kitchen.key);
  await signIn(page, '/admin/login', admin().phone);
  await page.goto(`/admin/partners/${kitchen.id}/menu/dishes/${dish.id}`);
  await page.getByLabel('Price in rupees').fill(String(dish.priceRupees + 5));
  await page.getByRole('button', { name: 'Save dish' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/partners/${kitchen.id}/menu\\?saved=`));
  const row = page.locator(`[data-testid="editor-dish"][data-dish-id="${dish.id}"]`);
  await expect(row.getByTestId('last-changed')).toContainText(`admin ${admin().phone.slice(0, 5)} ${admin().phone.slice(5)}`);
});
