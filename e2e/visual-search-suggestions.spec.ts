/**
 * Search suggestions while typing (003, FR-012, SC-008): kitchens and dishes from the second letter,
 * a dish opens its kitchen at that dish, Enter still runs the existing search.
 */
import { expect, test } from '@playwright/test';
import { orderableKitchen, searchableDish } from './catalogue';
import { resetDemoData } from './reset';

test.beforeAll(async () => {
  await resetDemoData();
});

test.use({ viewport: { width: 390, height: 844 } });

test('dish and kitchen suggestions, no-match line and plain search (FR-012, SC-008)', async ({ page }) => {
  const { kitchen, dish, enTerm } = searchableDish();
  // The full names, so the dish is among the capped suggestions in either language.
  for (const term of [dish.name.en!, dish.name.kn!]) {
    await page.goto('/');
    const started = Date.now();
    await page.getByRole('searchbox').pressSequentially([...term].slice(0, 2).join(''));
    const suggestions = page.getByTestId('search-suggestions');
    await expect(suggestions).toBeVisible({ timeout: 1000 + 500 });
    expect(Date.now() - started, 'suggestions within 1 s of the second letter').toBeLessThan(1500);
    await page.getByRole('searchbox').fill(term);
    const dishLink = suggestions.locator(`a[href$="#dish-${dish.id}"]`);
    await expect(dishLink).toBeVisible();
    await dishLink.click();
    await expect(page).toHaveURL(`/kitchens/${kitchen.id}#dish-${dish.id}`);
    await expect(page.locator(`[data-dish-id="${dish.id}"]`)).toBeInViewport();
  }

  const target = orderableKitchen();
  await page.goto('/');
  await page.getByRole('searchbox').fill(target.displayName.slice(0, 6));
  await page.getByTestId('search-suggestions').locator(`a[href="/kitchens/${target.id}"]`).click();
  await expect(page).toHaveURL(`/kitchens/${target.id}`);

  await page.goto('/');
  await page.getByRole('searchbox').fill('zqxv');
  await expect(page.getByTestId('search-no-matches')).toBeVisible();

  await page.getByRole('searchbox').fill(enTerm);
  await page.getByRole('searchbox').press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(enTerm);
});
