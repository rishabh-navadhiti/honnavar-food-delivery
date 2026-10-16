/**
 * Layout rules for the visual refresh (003, FR-027, research R13): no sideways scroll, 48 px
 * targets, no clipped text, one fixed bar at the top and one at the bottom, the reference counts,
 * and the four-tap cash order. Subjects come from catalogue flags.
 */
import { expect, test, type Page } from '@playwright/test';
import { availableDishesIn, demoCustomer, orderableKitchen, placedOrder } from './catalogue';
import { blockMapTiles, openAllDay } from './fixtures';
import {
  clippedText,
  fixedChrome,
  fullyVisibleCount,
  horizontalOverflow,
  setLocale,
  smallTargets,
  truncatedWithoutFullText,
  type Locale,
} from './layout';
import { msg } from './messages';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

const LOCALES: Locale[] = ['en', 'kn'];
const PHONES = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
];

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(orderableKitchen().id);
});

async function expectLayoutRules(page: Page, where: string, options: { customer?: boolean } = {}) {
  expect(await horizontalOverflow(page), `${where}: sideways scroll`).toBeLessThanOrEqual(0);
  expect(await smallTargets(page), `${where}: targets under 48 px`).toEqual([]);
  expect(await clippedText(page), `${where}: clipped text`).toEqual([]);
  expect(await truncatedWithoutFullText(page), `${where}: truncated without full text`).toEqual([]);
  const chrome = await fixedChrome(page);
  expect(chrome.top, `${where}: fixed bars at the top`).toBeLessThanOrEqual(1);
  expect(chrome.bottom, `${where}: fixed bars at the bottom`).toBeLessThanOrEqual(1);
  const size = page.viewportSize()!;
  if (options.customer && size.width === 360 && size.height === 780) {
    expect(chrome.totalHeight, `${where}: fixed bars over 18% of 360×780`).toBeLessThanOrEqual(0.18 * 780);
  }
}

test('customer reference screens keep the layout rules in both languages (FR-027, SC-003–SC-005)', async ({ page }) => {
  test.setTimeout(240_000);
  const fontRequests: string[] = [];
  page.on('request', (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) fontRequests.push(r.url());
  });
  await blockMapTiles(page);
  const kitchen = orderableKitchen();
  await setLocale(page, 'en');
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto(`/kitchens/${kitchen.id}`);
  await page.locator(`[data-dish-id="${availableDishesIn(kitchen.key)[0]!.id}"]`).getByRole('button', { name: msg('en', 'cart.add'), exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toBeVisible();

  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const size of PHONES) {
      await page.setViewportSize(size);
      for (const route of ['/', `/kitchens/${kitchen.id}`, '/cart', `/orders/${placedOrder().id}`]) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expectLayoutRules(page, `${route} ${size.width} ${locale}`, { customer: true });
      }
    }
  }
  expect(fontRequests, 'pages request an outside font service (FR-007)').toEqual([]);
});

test('home shows three kitchens at 390×844 and four at 430×932 (SC-007a)', async ({ page }) => {
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const [size, least] of [
      [{ width: 390, height: 844 }, 3],
      [{ width: 430, height: 932 }, 4],
    ] as const) {
      await page.setViewportSize(size);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect(await fullyVisibleCount(page, page.getByTestId('kitchen-card')), `${size.width} ${locale}`).toBeGreaterThanOrEqual(least);
    }
  }
});

test('four taps from home to a placed cash order at 360 and 390 px, in both languages (FR-004, SC-002)', async ({ page }) => {
  test.setTimeout(240_000);
  const kitchen = orderableKitchen();
  const dish = availableDishesIn(kitchen.key)[0]!;
  await setLocale(page, 'en');
  await signIn(page, '/login', demoCustomer().phone);
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const size of PHONES) {
      await page.setViewportSize(size);
      await page.goto('/');
      await page.locator(`[data-testid="kitchen-card"][data-kitchen-id="${kitchen.id}"] a`).first().click(); // 1
      await page.locator(`[data-dish-id="${dish.id}"]`).getByRole('button', { name: msg(locale, 'cart.add'), exact: true }).click(); // 2
      await expect(page.getByTestId('cart-bar')).toBeVisible();
      await page.getByTestId('header-cart').click(); // 3
      await expect(page.getByRole('radio', { name: msg(locale, 'paymentMethod.cod') })).toBeChecked();
      await page.getByRole('button', { name: new RegExp(`^${msg(locale, 'checkout.placeOrder')}`) }).click(); // 4
      await expect(page, `${size.width} ${locale}`).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
      await expect(page.getByText(/#\d{4}/).first()).toBeVisible();
    }
  }
});
