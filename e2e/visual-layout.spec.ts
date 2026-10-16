/**
 * Layout rules for the visual refresh (003, FR-027, research R13): no sideways scroll, 48 px
 * targets, no clipped text, one fixed bar at the top and one at the bottom, the reference counts,
 * and the four-tap cash order. Subjects come from catalogue flags.
 */
import { expect, test, type Page } from '@playwright/test';
import { admin, availableDishesIn, demoCustomer, orderableKitchen, placedOrder, readyOrder, type KitchenRef } from './catalogue';
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
    // 003 density: top bar 52 + tab bar 64 = 116 px (kitchen: 52 + cart bar 68), under 16% of 360×780 (spec: 18%).
    expect(chrome.totalHeight, `${where}: fixed bars over 16% of 360×780`).toBeLessThanOrEqual(0.16 * 780);
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

  // The floating cart button covers no other control, even at the end of a list (owner review).
  for (const size of PHONES) {
    await page.setViewportSize(size);
    for (const route of ['/', '/orders', '/account']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const covered = await page.evaluate(() => {
        const cart = document.querySelector('[data-testid="header-cart"]')!;
        const button = cart.getBoundingClientRect();
        return [...document.querySelectorAll<HTMLElement>('main a, main button, main input, main select')]
          .filter((el) => {
            if (cart.contains(el)) return false;
            const box = el.getBoundingClientRect();
            return box.width > 0 && box.right > button.left && box.left < button.right && box.bottom > button.top && box.top < button.bottom;
          })
          .map((el) => (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30));
      });
      expect(covered, `${route} ${size.width}: controls under the floating cart button`).toEqual([]);
    }
  }
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

/** Places a cash order at `kitchen` as the demo customer, in a separate browser context. */
async function placeCashOrder(page: Page, kitchen: KitchenRef) {
  const context = await page.context().browser()!.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const customer = await context.newPage();
  await signIn(customer, '/login', demoCustomer().phone);
  await customer.goto(`/kitchens/${kitchen.id}`);
  await customer.locator(`[data-dish-id="${availableDishesIn(kitchen.key)[0]!.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
  await customer.getByTestId('header-cart').click();
  await customer.getByRole('radio', { name: 'Cash on delivery' }).check();
  await customer.getByRole('button', { name: /Place order/ }).click();
  await customer.waitForURL(/\/orders\/[0-9a-f-]{36}$/);
  await context.close();
}

test('partner orders keep the layout rules, show three cards and fit the reject step (FR-027, SC-007, FR-019)', async ({ page }) => {
  test.setTimeout(240_000);
  const kitchen = placedOrder().kitchen;
  await openAllDay(kitchen.id);
  await placeCashOrder(page, kitchen);
  await placeCashOrder(page, kitchen);
  await setLocale(page, 'en');
  await signIn(page, '/partner/login', kitchen.signins[0]!.phone);
  // A service-time mix like the reference: sound on (pill), one waiting, one accepted, one preparing.
  await page.goto('/partner/orders');
  await page.getByTestId('sound-prompt').click();
  await page.getByRole('button', { name: 'Accept order' }).last().click();
  await expect(page.getByRole('button', { name: 'Start preparing' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Accept order' }).last().click();
  await expect(page.getByRole('button', { name: 'Start preparing' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Start preparing' }).last().click();
  await expect(page.getByRole('button', { name: 'Ready for pickup' })).toHaveCount(1);
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const size of PHONES) {
      await page.setViewportSize(size);
      await page.goto('/partner/orders');
      await page.waitForLoadState('networkidle');
      await expectLayoutRules(page, `/partner/orders ${size.width} ${locale}`);
      if (size.width === 390) {
        expect(await fullyVisibleCount(page, page.getByTestId('partner-order')), `cards at 390×844 ${locale}`).toBeGreaterThanOrEqual(3);
        await page.getByTestId('partner-order').first().getByRole('button', { name: msg(locale, 'partnerOrders.reject'), exact: true }).click();
        const sheet = page.getByTestId('reject-sheet');
        await expect(sheet).toBeVisible();
        // Measure where the sheet comes to rest, after its entrance animation.
        await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        const box = (await sheet.boundingBox())!;
        expect(box.y, `reject step starts on screen (${locale})`).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height, `reject step fits 390×844 without scrolling (${locale})`).toBeLessThanOrEqual(844);
        await expect(sheet.getByRole('button', { name: msg(locale, 'partnerOrders.confirmReject') })).toBeInViewport();
      }
    }
  }
});

test('the admin board shows every group side by side at 1280 px, in both languages (FR-020, SC-003)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setLocale(page, 'en');
  await signIn(page, '/admin/login', admin().phone);
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');
    await expectLayoutRules(page, `/admin/orders 1280 ${locale}`);
    for (const group of ['waiting_kitchen', 'needs_agent', 'assigned', 'out_for_delivery', 'finished']) {
      const box = (await page.getByTestId(`group-${group}`).boundingBox())!;
      expect(box.x, `${group} starts on screen (${locale})`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${group} ends on screen (${locale})`).toBeLessThanOrEqual(1280);
    }
    // Between 1024 and 1280 px the columns keep 200 px and the board, not the page, scrolls.
    await page.setViewportSize({ width: 1024, height: 768 });
    expect(await horizontalOverflow(page), `page scrolls sideways at 1024 (${locale})`).toBeLessThanOrEqual(0);
    expect((await page.getByTestId('group-finished').boundingBox())!.width).toBeGreaterThanOrEqual(199);
  }
});

test('agent home and order page keep the layout rules with one primary next step (FR-022, FR-023)', async ({ page }) => {
  test.setTimeout(180_000);
  await blockMapTiles(page);
  const order = readyOrder();
  await setLocale(page, 'en');
  await signIn(page, '/agent/login', order.agent!.phone);
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const size of PHONES) {
      await page.setViewportSize(size);
      for (const route of ['/agent', `/agent/orders/${order.id}`]) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expectLayoutRules(page, `${route} ${size.width} ${locale}`);
      }
      const primaries = await page.evaluate(
        () => [...document.querySelectorAll<HTMLElement>('main a, main button')].filter((e) => e.offsetParent && e.classList.contains('bg-primary')).length,
      );
      expect(primaries, `one primary action on the agent order page (${size.width} ${locale})`).toBe(1);
    }
  }
});

/** Height of the first match, in CSS px. */
async function height(page: Page, selector: string): Promise<number> {
  return Math.round((await page.locator(selector).first().boundingBox())!.height);
}

test('the density scale holds on the customer screens (003 density follow-up)', async ({ page }) => {
  const kitchen = orderableKitchen();
  const dish = availableDishesIn(kitchen.key)[0]!;
  await page.setViewportSize({ width: 390, height: 844 });
  await setLocale(page, 'en');
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('kitchen-card').first()).toBeVisible();
  expect(await height(page, 'header > div'), 'top bar').toBe(52);
  expect(await height(page, 'nav[aria-label] ul.h-tabbar'), 'tab bar').toBe(64);
  expect(await height(page, 'form[role="search"] > div'), 'search field').toBe(44);
  expect(await height(page, 'form[role="search"] button[type="submit"]'), 'search submit').toBe(36);
  expect(await height(page, '[data-testid="filter-open-now"] > span'), 'filter chip').toBe(36);
  expect(await height(page, '[data-testid="dish-filter"] [role="group"]'), 'segmented control').toBe(40);
  const photo = page.getByTestId('kitchen-card').first().locator('img').first();
  expect(Math.round((await photo.boundingBox())!.width), 'kitchen photo').toBe(88);

  await page.goto(`/kitchens/${kitchen.id}`);
  const row = page.locator(`[data-dish-id="${dish.id}"]`);
  await expect(row).toBeVisible();
  const dishPhoto = (await row.locator('img').first().boundingBox())!;
  const add = (await row.getByRole('button', { name: 'Add', exact: true }).boundingBox())!;
  expect(Math.round(dishPhoto.width), 'dish photo').toBe(96);
  expect(Math.round(add.height), 'Add button').toBe(36);
  expect(add.y, 'Add sits under the photo, not over it').toBeGreaterThanOrEqual(dishPhoto.y + dishPhoto.height);
  await row.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toBeVisible();
  expect(await height(page, '[data-testid="header-cart"]'), 'kitchen cart bar button').toBe(52);

  await page.getByTestId('header-cart').click();
  await expect(page).toHaveURL('/cart');
  await expect(page.getByTestId('place-order-bar')).toBeVisible();
  expect(await height(page, '[data-testid="place-order-bar"] button[type="submit"]'), 'place-order button').toBe(52);
});
