/**
 * Loading, empty, error and not-found states look intentional (003, US6, FR-024, SC-009).
 */
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { admin, orderableKitchen, placedOrder, readyOrder } from './catalogue';
import { blockMapTiles } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

test.beforeAll(async () => {
  await resetDemoData();
});

test.use({ viewport: { width: 390, height: 844 } });

async function expectNotFound(page: Page, path: string, home: string) {
  await page.goto(path);
  const state = page.getByTestId('not-found');
  await expect(state, path).toBeVisible();
  await expect(state.getByRole('link'), `${path}: a way back`).toHaveAttribute('href', home);
  await expect(page.getByRole('navigation').last(), `${path}: the surface's navigation`).toBeVisible();
}

test("not-found pages keep each surface's theme, navigation and a way back (FR-024)", async ({ page, browser }) => {
  await expectNotFound(page, `/kitchens/${randomUUID()}`, '/');

  await signIn(page, '/partner/login', placedOrder().kitchen.signins[0]!.phone);
  await expectNotFound(page, `/partner/orders/${randomUUID()}`, '/partner');

  const agentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const agent = await agentContext.newPage();
  await signIn(agent, '/agent/login', readyOrder().agent!.phone);
  await expectNotFound(agent, `/agent/orders/${randomUUID()}`, '/agent');
  await agentContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desk = await adminContext.newPage();
  await signIn(desk, '/admin/login', admin().phone);
  await expectNotFound(desk, `/admin/orders/${randomUUID()}`, '/admin');
  await adminContext.close();
});

test('the empty cart shows its illustration with the tab bar, not the place-order bar or a cart button', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByRole('navigation').last()).toBeVisible();
  await expect(page.getByTestId('header-cart')).toHaveCount(0);
  await expect(page.getByTestId('place-order-bar')).toHaveCount(0);
  await expect(page.locator('main svg[aria-hidden="true"]').first()).toBeVisible();
});

/** Cumulative layout shift after load, with images arriving late (SC-009). */
async function layoutShift(page: Page, path: string): Promise<number> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 300);
      }),
  );
}

test('content does not jump when images and data arrive (SC-009)', async ({ page, browser }) => {
  await page.route('**/media/**', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });
  await blockMapTiles(page);
  expect(await layoutShift(page, '/'), 'home').toBeLessThan(0.1);
  expect(await layoutShift(page, `/kitchens/${orderableKitchen().id}`), 'kitchen').toBeLessThan(0.1);

  await signIn(page, '/partner/login', placedOrder().kitchen.signins[0]!.phone);
  expect(await layoutShift(page, '/partner/orders'), 'partner orders').toBeLessThan(0.1);

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desk = await adminContext.newPage();
  await signIn(desk, '/admin/login', admin().phone);
  expect(await layoutShift(desk, '/admin/orders'), 'board').toBeLessThan(0.1);
  await adminContext.close();
});
