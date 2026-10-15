import { expect, test } from '@playwright/test';
import { activeAgent, inactiveAgent, kitchenWithHelper } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('a new customer signs in with any mobile number', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('demo-code-notice')).toBeVisible();
  await signIn(page, '/login', '9123456780');
  await page.goto('/account');
  await expect(page.getByText('91234 56780')).toBeVisible();
});

test('a partner helper reaches their own kitchen; partner numbers are refused elsewhere', async ({ page }) => {
  const { kitchen, helperPhone } = kitchenWithHelper();
  await signIn(page, '/partner/login', helperPhone);
  await expect(page).toHaveURL('/partner');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(kitchen.displayName);

  // Signed in as a partner does not sign you in as an agent (FR-002).
  await page.goto('/agent');
  await expect(page).toHaveURL('/agent/login');

  // The partner number is not registered as an agent.
  await page.getByLabel('Mobile number').fill(helperPhone);
  await page.getByRole('button', { name: 'Get code' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'not registered' })).toBeVisible();

  // Sign out returns to that surface's sign-in screen.
  await page.goto('/partner');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/partner/login');
});

test('an inactive agent is refused; an active agent sees no deliveries and their profile', async ({ page }) => {
  await page.goto('/agent/login');
  await page.getByLabel('Mobile number').fill(inactiveAgent().phone);
  await page.getByRole('button', { name: 'Get code' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'not active' })).toBeVisible();

  const agent = activeAgent();
  await signIn(page, '/agent/login', agent.phone);
  await expect(page.getByText('No deliveries yet')).toBeVisible();
  await page.getByRole('link', { name: 'Profile' }).click();
  await expect(page.getByText(agent.name)).toBeVisible();
});

test('a wrong code is refused with a clear message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9123456781');
  await page.getByRole('button', { name: 'Get code' }).click();
  await page.getByLabel('6-digit code').fill('000000');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'not right' })).toBeVisible();
});
