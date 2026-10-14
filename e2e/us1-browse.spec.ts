import { expect, test } from '@playwright/test';
import {
  activeKitchens,
  availableDishIn,
  dishWithoutKannadaName,
  kitchenWithHelper,
  pendingKitchen,
  suspendedKitchen,
  temporarilyClosedKitchen,
} from './catalogue';
import { resetDemoData } from './reset';

test.beforeAll(resetDemoData);

test('a guest browses kitchens and reads a menu in both languages', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByTestId('kitchen-card');
  await expect(cards).toHaveCount(activeKitchens().length);
  await expect(page.getByText(pendingKitchen().displayName)).toHaveCount(0);
  await expect(page.getByText(suspendedKitchen().displayName)).toHaveCount(0);

  const closed = temporarilyClosedKitchen();
  await expect(cards.filter({ hasText: closed.displayName }).getByTestId('kitchen-state')).toContainText(
    'Temporarily closed',
  );

  const { kitchen } = kitchenWithHelper();
  await cards.filter({ hasText: kitchen.displayName }).getByRole('link').first().click();
  await expect(page).toHaveURL(`/kitchens/${kitchen.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(kitchen.displayName);
  await expect(page.getByText(availableDishIn(kitchen.key).displayName).first()).toBeVisible();
  const primary = kitchen.contacts.find((c) => c.isPrimary)!.phone;
  await expect(page.getByRole('link', { name: /call/i })).toHaveAttribute('href', `tel:+91${primary}`);

  // Switch to Kannada: interface text, kitchen names and prices change; the choice survives a reload.
  await page.getByRole('button', { name: 'Switch to Kannada' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'kn');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(kitchen.name.kn!);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'kn');

  // A dish with no Kannada name shows its English name with the fallback marker.
  const missing = dishWithoutKannadaName();
  await page.goto(`/kitchens/${missing.kitchen.id}`);
  const row = page.getByTestId('dish-row').filter({ hasText: missing.dish.name.en! });
  await expect(row.getByTestId('fallback-marker').first()).toBeVisible();

  // Unknown kitchen id: friendly not-found screen.
  await page.goto('/kitchens/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('link', { name: 'ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ' })).toBeVisible();
});
