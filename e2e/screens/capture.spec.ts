/**
 * Review screenshots (003, FR-028, research R14): `npm run screens`.
 *
 * Every route of each surface, customer, partner and agent at 360×780 and 390×844, admin at
 * 1280×800, in English and Kannada, plus a fixed list of states. Images go to
 * `screens/<surface>/<route>-<width>-<locale>.png` with a `screens/index.html` contact sheet.
 * Subjects come from catalogue flags, never names. Not part of `npm run test:e2e`.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  admin,
  availableDishesIn,
  demoCustomer,
  orderableKitchen,
  placedOrder,
  readyOrder,
  searchableDish,
} from '../catalogue';
import { blockMapTiles, openAllDay } from '../fixtures';
import { setLocale, type Locale } from '../layout';
import { resetDemoData } from '../reset';
import { signIn } from '../sign-in';

const OUT = path.resolve('screens');
const PHONE = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
];
const DESKTOP = [{ width: 1280, height: 800 }];
const LOCALES: Locale[] = ['en', 'kn'];

type Shot = { route: string; name: string; before?: (page: Page) => Promise<void> };

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(orderableKitchen().id);
  mkdirSync(OUT, { recursive: true });
});

async function newContext(browser: Browser, phone: boolean): Promise<BrowserContext> {
  return browser.newContext(phone ? { isMobile: true, hasTouch: true, viewport: PHONE[0] } : { viewport: DESKTOP[0] });
}

/** Optional states are best effort: a missing control is noted in the file name, never a failure. */
async function tryStep(page: Page, step: (page: Page) => Promise<void>): Promise<boolean> {
  try {
    await step(page);
    return true;
  } catch {
    return false;
  }
}

async function capture(page: Page, surface: string, sizes: { width: number; height: number }[], shots: Shot[]): Promise<void> {
  mkdirSync(path.join(OUT, surface), { recursive: true });
  for (const locale of LOCALES) {
    await setLocale(page, locale);
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const shot of shots) {
        await page.goto(shot.route);
        await page.waitForLoadState('networkidle');
        const ok = shot.before ? await tryStep(page, shot.before) : true;
        const file = `${shot.name}${ok ? '' : '-state-missing'}-${size.width}-${locale}.png`;
        await page.screenshot({ path: path.join(OUT, surface, file), fullPage: true });
      }
    }
  }
}

test('customer screens', async ({ browser }) => {
  const kitchen = orderableKitchen();
  const [first, second] = availableDishesIn(kitchen.key);
  const order = placedOrder();
  const search = searchableDish();

  // Guest: sign-in screen and the empty cart.
  const guest = await newContext(browser, true);
  const guestPage = await guest.newPage();
  await capture(guestPage, 'customer', PHONE, [
    { route: '/login', name: 'login' },
    { route: '/cart', name: 'cart-empty' },
  ]);
  await guest.close();

  const context = await newContext(browser, true);
  const page = await context.newPage();
  await blockMapTiles(page);
  await setLocale(page, 'en');
  await signIn(page, '/login', demoCustomer().phone);
  // Two dishes in the cart for the cart, tab bar and place-order bar states.
  await page.goto(`/kitchens/${kitchen.id}`);
  for (const dish of [first!, second!]) {
    await page.locator(`[data-dish-id="${dish.id}"]`).getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForLoadState('networkidle');
  }

  await capture(page, 'customer', PHONE, [
    { route: '/', name: 'home' },
    {
      route: '/',
      name: 'home-suggestions',
      before: async (p) => {
        await p.getByRole('searchbox').fill(search.enTerm.slice(0, 2));
        await p.getByTestId('search-suggestions').waitFor({ timeout: 3000 });
      },
    },
    { route: `/?q=${encodeURIComponent(search.enTerm)}`, name: 'search-results' },
    { route: `/kitchens/${kitchen.id}`, name: 'kitchen' },
    {
      route: `/kitchens/${kitchen.id}`,
      name: 'kitchen-address-hours',
      before: async (p) => {
        await p.locator('details summary').first().click({ timeout: 3000 });
      },
    },
    { route: `/kitchens/${kitchen.id}#dish-${second!.id}`, name: 'kitchen-at-dish' },
    { route: '/cart', name: 'cart' },
    {
      route: '/cart',
      name: 'cart-upi-sheet',
      before: async (p) => {
        await p.getByText(/UPI/).first().click({ timeout: 3000 });
        await p.getByRole('button', { name: /Place order|ಆರ್ಡರ್ ಮಾಡಿ/ }).click({ timeout: 3000 });
        await p.getByRole('dialog').waitFor({ timeout: 3000 });
      },
    },
    { route: '/orders', name: 'orders' },
    { route: `/orders/${order.id}`, name: 'order' },
    { route: '/messages', name: 'messages' },
    { route: '/account', name: 'account' },
    { route: '/addresses', name: 'addresses' },
    { route: '/addresses/new', name: 'address-new' },
  ]);
  await context.close();
});

test('partner screens', async ({ browser }) => {
  const order = placedOrder();
  const guest = await newContext(browser, true);
  await capture(await guest.newPage(), 'partner', PHONE, [{ route: '/partner/login', name: 'login' }]);
  await guest.close();

  const context = await newContext(browser, true);
  const page = await context.newPage();
  await setLocale(page, 'en');
  await signIn(page, '/partner/login', order.kitchen.signins[0]!.phone);
  // First visit: the full sound prompt, before any tap.
  await capture(page, 'partner', [PHONE[1]!], [{ route: '/partner/orders', name: 'orders-sound-prompt' }]);
  await page.getByTestId('sound-prompt').click();
  await capture(page, 'partner', PHONE, [
    { route: '/partner/orders', name: 'orders' },
    { route: `/partner/orders/${order.id}`, name: 'order' },
    {
      route: `/partner/orders/${order.id}`,
      name: 'order-reject',
      before: async (p) => {
        await p.getByRole('button', { name: /^(Reject|ಬೇಡ ಎನ್ನಿ)/ }).first().click({ timeout: 3000 });
      },
    },
    { route: '/partner', name: 'home' },
    { route: '/partner/day', name: 'day' },
    { route: '/partner/menu', name: 'menu' },
    { route: '/partner/hours', name: 'hours' },
    { route: '/partner/kitchen', name: 'kitchen' },
    { route: '/partner/messages', name: 'messages' },
  ]);
  await context.close();
});

test('agent screens', async ({ browser }) => {
  const order = readyOrder();
  const guest = await newContext(browser, true);
  await capture(await guest.newPage(), 'agent', PHONE, [{ route: '/agent/login', name: 'login' }]);
  await guest.close();

  const context = await newContext(browser, true);
  const page = await context.newPage();
  await setLocale(page, 'en');
  await signIn(page, '/agent/login', order.agent!.phone);
  await capture(page, 'agent', PHONE, [
    { route: '/agent', name: 'home' },
    { route: `/agent/orders/${order.id}`, name: 'order' },
    { route: '/agent/messages', name: 'messages' },
    { route: '/agent/profile', name: 'profile' },
  ]);
  await context.close();
});

test('admin screens', async ({ browser }) => {
  const order = placedOrder();
  const kitchenId = order.kitchen.id;
  const guest = await newContext(browser, false);
  await capture(await guest.newPage(), 'admin', DESKTOP, [{ route: '/admin/login', name: 'login' }]);
  await guest.close();

  const context = await newContext(browser, false);
  const page = await context.newPage();
  await setLocale(page, 'en');
  await signIn(page, '/admin/login', admin().phone);
  await capture(page, 'admin', DESKTOP, [
    { route: '/admin/orders', name: 'board' },
    { route: `/admin/orders/${order.id}`, name: 'order' },
    { route: '/admin/partners', name: 'partners' },
    { route: `/admin/partners/${kitchenId}`, name: 'partner' },
    { route: `/admin/partners/${kitchenId}/menu`, name: 'partner-menu' },
    { route: `/admin/partners/${kitchenId}/hours`, name: 'partner-hours' },
    { route: '/admin/agents', name: 'agents' },
    { route: '/admin/agents/new', name: 'agent-new' },
  ]);
  await context.close();
});

test.afterAll(() => {
  const sections = ['customer', 'partner', 'agent', 'admin']
    .map((surface) => {
      const dir = path.join(OUT, surface);
      let files: string[] = [];
      try {
        files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
      } catch {
        return '';
      }
      const figures = files
        .map((f) => `<figure><a href="${surface}/${f}"><img src="${surface}/${f}" loading="lazy" alt=""></a><figcaption>${f}</figcaption></figure>`)
        .join('\n');
      return `<h2>${surface}</h2>\n<div class="grid">${figures}</div>`;
    })
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>Screens</title>
<style>body{font:14px system-ui;margin:24px;background:#f4f1ec}.grid{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
figure{margin:0;background:#fff;padding:8px;border-radius:8px}img{width:240px;display:block}figcaption{font-size:12px;margin-top:4px}</style>
<h1>Review screens</h1><p>Generated by npm run screens on ${new Date().toISOString()}.</p>${sections}`;
  writeFileSync(path.join(OUT, 'index.html'), html);
});
