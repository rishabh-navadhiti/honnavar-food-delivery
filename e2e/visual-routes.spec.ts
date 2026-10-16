/**
 * Every route of every surface in both languages (003, US5, FR-011, SC-003, SC-005): no sideways
 * scroll, no clipped text, 48 px targets; readable line lengths at tablet width; and motion that
 * is short and switched off under reduced motion (FR-010, SC-010). Subjects from catalogue flags.
 */
import { expect, test, type Page } from '@playwright/test';
import { demoIds } from '../src/features/demo/ids';
import {
  admin,
  availableDishesIn,
  demoCustomer,
  orderableKitchen,
  placedOrder,
  readyOrder,
} from './catalogue';
import { blockMapTiles, openAllDay } from './fixtures';
import { clippedText, horizontalOverflow, setLocale, smallTargets, wideTextBlocks, type Locale } from './layout';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

const LOCALES: Locale[] = ['en', 'kn'];
const PHONES = [
  { width: 360, height: 780 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
];

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(orderableKitchen().id);
});

async function sweep(page: Page, routes: string[], sizes: { width: number; height: number }[]) {
  const problems: string[] = [];
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const where = `${route} ${size.width} ${locale}`;
        const overflow = await horizontalOverflow(page);
        if (overflow > 0) problems.push(`${where}: scrolls sideways by ${overflow}px`);
        for (const p of await clippedText(page)) problems.push(`${where}: clipped ${p}`);
        for (const p of await smallTargets(page)) problems.push(`${where}: small target ${p}`);
        if (size.width === 768) for (const p of await wideTextBlocks(page, 720)) problems.push(`${where}: wide text ${p}`);
      }
    }
  }
  expect(problems).toEqual([]);
}

test('customer routes (US5)', async ({ page }) => {
  test.setTimeout(600_000);
  await blockMapTiles(page);
  const kitchen = orderableKitchen();
  const customer = demoCustomer();
  await sweep(page, ['/login', '/cart'], PHONES);
  await setLocale(page, 'en');
  await signIn(page, '/login', customer.phone);
  await page.goto(`/kitchens/${kitchen.id}`);
  await page.locator(`[data-dish-id="${availableDishesIn(kitchen.key)[0]!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toBeVisible();
  await sweep(
    page,
    [
      '/',
      `/?q=${encodeURIComponent(kitchen.displayName.slice(0, 4))}`,
      `/kitchens/${kitchen.id}`,
      '/cart',
      '/orders',
      `/orders/${placedOrder().id}`,
      '/messages',
      '/account',
      '/addresses',
      '/addresses/new',
      `/addresses/${demoIds.address(customer.key, customer.addresses[0]!.key)}`,
    ],
    PHONES,
  );
});

test('partner routes (US5)', async ({ page }) => {
  test.setTimeout(600_000);
  const kitchen = placedOrder().kitchen;
  const category = kitchen.categories[0]!;
  const dish = category.dishes[0]!;
  await sweep(page, ['/partner/login'], PHONES);
  await setLocale(page, 'en');
  await signIn(page, '/partner/login', kitchen.signins[0]!.phone);
  await sweep(
    page,
    [
      '/partner',
      '/partner/orders',
      `/partner/orders/${placedOrder().id}`,
      '/partner/day',
      '/partner/menu',
      '/partner/menu/categories/new',
      `/partner/menu/categories/${demoIds.category(kitchen.key, category.key)}`,
      '/partner/menu/dishes/new',
      `/partner/menu/dishes/${demoIds.dish(kitchen.key, dish.key)}`,
      '/partner/hours',
      '/partner/kitchen',
      '/partner/messages',
    ],
    PHONES,
  );
});

test('agent routes (US5)', async ({ page }) => {
  test.setTimeout(300_000);
  await blockMapTiles(page);
  const order = readyOrder();
  await sweep(page, ['/agent/login'], PHONES);
  await setLocale(page, 'en');
  await signIn(page, '/agent/login', order.agent!.phone);
  await sweep(page, ['/agent', `/agent/orders/${order.id}`, '/agent/messages', '/agent/profile'], PHONES);
});

test('admin routes at 1280 px (US5)', async ({ page }) => {
  test.setTimeout(300_000);
  const desktop = [{ width: 1280, height: 800 }];
  const kitchen = placedOrder().kitchen;
  const category = kitchen.categories[0]!;
  const dish = category.dishes[0]!;
  await page.setViewportSize(desktop[0]!);
  await sweep(page, ['/admin/login'], desktop);
  await setLocale(page, 'en');
  await signIn(page, '/admin/login', admin().phone);
  await sweep(
    page,
    [
      '/admin/orders',
      `/admin/orders/${placedOrder().id}`,
      '/admin/partners',
      '/admin/partners/new',
      `/admin/partners/${kitchen.id}`,
      `/admin/partners/${kitchen.id}/menu`,
      `/admin/partners/${kitchen.id}/menu/categories/${demoIds.category(kitchen.key, category.key)}`,
      `/admin/partners/${kitchen.id}/menu/dishes/${demoIds.dish(kitchen.key, dish.key)}`,
      `/admin/partners/${kitchen.id}/hours`,
      '/admin/agents',
      '/admin/agents/new',
      `/admin/agents/${readyOrder().agent!.id}`,
    ],
    desktop,
  );
});

test('motion is short, and off under reduced motion (FR-010, SC-010)', async ({ page }) => {
  const kitchen = placedOrder().kitchen;
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, '/partner/login', kitchen.signins[0]!.phone);
  for (const reduced of [false, true]) {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/partner/orders');
    await page.getByRole('button', { name: 'Reject', exact: true }).first().click();
    const sheet = page.getByTestId('reject-sheet');
    await expect(sheet).toBeVisible();
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')].flatMap((el) => {
        const style = getComputedStyle(el);
        return [...style.animationDuration.split(','), ...style.transitionDuration.split(',')].map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000));
      }),
    );
    const sheetAnimation = await sheet.evaluate((el) => getComputedStyle(el).animationDuration);
    if (reduced) {
      expect(sheetAnimation).toBe('0s');
      expect(Math.max(...durations)).toBe(0);
    } else {
      // The 1.2 s :target tint is a fade of a background, not a transition of layout; skip infinite pulses.
      expect(Math.max(...durations.filter((d) => d < 1000))).toBeLessThan(200);
    }
    await page.keyboard.press('Escape');
  }
});
