import { expect, test } from '@playwright/test';
import { availableDishIn, kitchenWithHelper } from './catalogue';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(resetDemoData);

test('a partner helper keeps the menu, hours and open status up to date', async ({ page }) => {
  const { kitchen, helperPhone } = kitchenWithHelper();
  const dish = availableDishIn(kitchen.key);
  await signIn(page, '/partner/login', helperPhone);

  // Mark a dish unavailable; customers see it dimmed with "Not available".
  await page.goto('/partner/menu');
  const editorRow = page.locator(`[data-testid="editor-dish"][data-dish-id="${dish.id}"]`);
  await editorRow.getByRole('button', { name: 'Mark not available' }).click();
  await expect(editorRow.getByRole('button', { name: 'Mark available' })).toBeVisible();
  await page.goto(`/kitchens/${kitchen.id}`);
  const customerRow = page.locator(`[data-testid="dish-row"][data-dish-id="${dish.id}"]`);
  await expect(customerRow).toHaveAttribute('data-available', 'false');
  await expect(customerRow.getByTestId('not-available')).toBeVisible();

  // A failed save keeps what was typed and shows the field error (FR-048).
  await page.goto('/partner/menu/dishes/new');
  await page.getByLabel('Dish name in English').fill('Test vade');
  await page.getByLabel('Price in rupees').fill('0');
  await page.getByRole('button', { name: 'Save dish' }).click();
  await expect(page.getByText('Enter a price between ₹1 and ₹1,00,000.')).toBeVisible();
  await expect(page.getByLabel('Dish name in English')).toHaveValue('Test vade');

  // Saving with only an English name works and reminds the partner about Kannada.
  await page.getByLabel('Price in rupees').fill('45');
  await page.getByRole('button', { name: 'Save dish' }).click();
  await expect(page).toHaveURL(/\/partner\/menu\?saved=.+&missing=kn/);
  await expect(page.getByTestId('saved-notice')).toContainText('Kannada name is missing');
  await page.goto(`/kitchens/${kitchen.id}`);
  await expect(page.getByTestId('dish-row').filter({ hasText: 'Test vade' })).toBeVisible();

  // Close for now: customers see "Temporarily closed"; Reopen restores normal hours.
  await page.goto('/partner');
  await page.getByRole('button', { name: 'Close for now' }).click();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
  await page.goto('/');
  const card = page.locator(`[data-testid="kitchen-card"][data-kitchen-id="${kitchen.id}"]`);
  await expect(card.getByTestId('kitchen-state')).toHaveAttribute('data-state', 'temporarilyClosed');
  await page.goto('/partner');
  await page.getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByRole('button', { name: 'Close for now' })).toBeVisible();
  await page.goto('/');
  await expect(card.getByTestId('kitchen-state')).not.toHaveAttribute('data-state', 'temporarilyClosed');

  // Overlapping ranges are refused with a day-specific error.
  await page.goto('/partner/hours');
  const monday = page.getByTestId('hours-day-1');
  await monday.getByRole('checkbox').uncheck();
  await monday.getByLabel(/First time range · Opens/).fill('11:00');
  await monday.getByLabel(/First time range · Closes/).fill('15:00');
  await monday.getByLabel(/Second time range \(optional\) · Opens/).fill('14:00');
  await monday.getByLabel(/Second time range \(optional\) · Closes/).fill('18:00');
  await page.getByRole('button', { name: 'Save hours' }).click();
  await expect(monday.getByRole('alert')).toHaveText('The two time ranges overlap.');
});
