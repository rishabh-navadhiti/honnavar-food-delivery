import { expect, test } from '@playwright/test';
import { activeKitchens, kitchenTypeCounts, nonVegKitchen, searchableDish, temporarilyClosedKitchen } from './catalogue';
import { resetDemoData } from './reset';

test.beforeAll(resetDemoData);

test('search finds the same dish in Kannada and English', async ({ page }) => {
  const { dish, knTerm, enTerm } = searchableDish();
  for (const term of [knTerm, enTerm]) {
    await page.goto('/');
    await page.getByRole('searchbox').fill(term);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/\?q=/); // search results show on the home screen since 002
    await expect(page.getByTestId('dish-result').filter({ hasText: dish.name.en! }).first()).toBeVisible();
  }
});

test('kitchen filters narrow the list', async ({ page }) => {
  for (const [type, count] of Object.entries(kitchenTypeCounts())) {
    await page.goto('/');
    await page.getByTestId(`filter-${type}`).click();
    await expect(page.getByTestId(`filter-${type}`)).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('kitchen-card')).toHaveCount(count);
  }
  await page.goto('/');
  await page.getByTestId('filter-open-now').click();
  await expect(page.locator(`[data-kitchen-id="${temporarilyClosedKitchen().id}"]`)).toHaveCount(0);
});

test('the dish filter carries into kitchen pages and is remembered', async ({ page }) => {
  const kitchen = nonVegKitchen();
  await page.goto('/');
  await page.getByRole('button', { name: 'Veg only', exact: true }).click();
  await expect(page.getByTestId('dish-filter')).toHaveAttribute('data-current', 'veg');
  await page.goto(`/kitchens/${kitchen.id}`);
  const rows = page.getByTestId('dish-row');
  await expect(rows.first()).toBeVisible();
  await expect(page.locator('[data-testid="dish-row"][data-veg="false"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('dish-filter')).toHaveAttribute('data-current', 'veg');
});

test('pure veg with non-veg only explains the empty list; one tap clears it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Non-veg only' }).click();
  await page.getByTestId('filter-pure-veg').click();
  await expect(page.getByText('Pure veg kitchens have no non-veg dishes.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('dish-filter')).toHaveAttribute('data-current', 'all');
  await expect(page.getByTestId('kitchen-card')).toHaveCount(activeKitchens().length);
});
