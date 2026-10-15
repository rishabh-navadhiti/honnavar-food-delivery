import { expect, test } from '@playwright/test';
import { kitchenTypeCounts, searchableDish } from './catalogue';
import { resetDemoData } from './reset';

test.beforeAll(resetDemoData);

test('home search keeps the filters in the URL, clears in place, and Back returns to the list', async ({ page }) => {
  const { dish, enTerm } = searchableDish();
  const restaurants = kitchenTypeCounts().restaurant;

  await page.goto('/?type=restaurant');
  await expect(page.getByTestId('kitchen-card')).toHaveCount(restaurants);

  // Searching stays on home and keeps the kitchen filter in the URL.
  await page.getByRole('searchbox').fill(enTerm);
  await page.getByRole('searchbox').press('Enter');
  const q = new URLSearchParams({ q: enTerm }).toString();
  await expect(page).toHaveURL(new RegExp(`/\\?(?=.*type=restaurant)(?=.*${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`));
  await expect(page.getByTestId('dish-result').filter({ hasText: dish.name.en! }).first()).toBeVisible();

  // Back returns to the list as it was.
  await page.goBack();
  await expect(page).toHaveURL('/?type=restaurant');
  await expect(page.getByTestId('kitchen-card')).toHaveCount(restaurants);

  // The clear control inside the field restores the list, keeping the filter.
  await page.goForward();
  await expect(page.getByTestId('dish-result').first()).toBeVisible();
  await page.getByRole('link', { name: 'Clear search' }).click();
  await expect(page).toHaveURL('/?type=restaurant');
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByTestId('kitchen-card')).toHaveCount(restaurants);

  // Old /search links still work.
  await page.goto(`/search?${q}`);
  await expect(page).toHaveURL(`/?${q}`);
});
