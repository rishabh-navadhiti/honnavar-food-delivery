import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { activeAgent, admin, availableDishIn, inactiveAgent, kitchenWithHelper } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('every sign-in screen shows its demo accounts and the fixed code', async ({ page }) => {
  const { helperPhone } = kitchenWithHelper();
  const expectations: [string, string][] = [
    ['/partner/login', helperPhone],
    ['/agent/login', activeAgent().phone],
    ['/agent/login', inactiveAgent().phone],
    ['/admin/login', admin().phone],
  ];
  for (const [path, phone] of expectations) {
    await page.goto(path);
    const panel = page.getByTestId('demo-panel');
    await expect(panel).toContainText('Demo only');
    await expect(panel).toContainText(process.env.DEMO_OTP_CODE ?? '123456');
    await expect(panel.locator(`li[data-phone="${phone}"]`)).toBeVisible();
  }
  await page.goto('/login');
  await expect(page.getByTestId('demo-panel')).toBeVisible();
});

test('one reset step undoes changes and keeps demo accounts working', async ({ page }) => {
  const { kitchen, helperPhone } = kitchenWithHelper();
  const dish = availableDishIn(kitchen.key);
  await signIn(page, '/partner/login', helperPhone);
  await page.goto('/partner/menu');
  await page.locator(`[data-testid="editor-dish"][data-dish-id="${dish.id}"]`).getByRole('button', { name: 'Mark not available' }).click();
  await page.goto(`/kitchens/${kitchen.id}`);
  await expect(page.locator(`[data-testid="dish-row"][data-dish-id="${dish.id}"]`)).toHaveAttribute('data-available', 'false');

  execSync('npm run demo:reset', { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });

  await page.goto(`/kitchens/${kitchen.id}`);
  await expect(page.locator(`[data-testid="dish-row"][data-dish-id="${dish.id}"]`)).toHaveAttribute('data-available', 'true');
  await page.context().clearCookies();
  await signIn(page, '/partner/login', helperPhone);
  await expect(page).toHaveURL('/partner');
});
