import { expect, test, type Page } from '@playwright/test';
import { availableDishesIn, demoCode, demoCustomer, orderableKitchen, secondOrderableKitchen } from './catalogue';
import { blockMapTiles, openAllDay, syntheticMicrophone } from './fixtures';
import { resetDemoData } from './reset';
import { signIn } from './sign-in';

const kitchen = orderableKitchen();
const other = secondOrderableKitchen();
const [first, second] = availableDishesIn(kitchen.key);
const otherDish = availableDishesIn(other.key)[0]!;
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

test.beforeAll(async () => {
  await resetDemoData();
  await openAllDay(kitchen.id);
  await openAllDay(other.id);
});

test.use({ geolocation: { latitude: 14.2845, longitude: 74.451 }, permissions: ['geolocation'] });

const dishRow = (page: Page, dishId: string) => page.locator(`[data-dish-id="${dishId}"]`);

test('a guest builds a one-kitchen cart, signs in at checkout and pays by UPI (demo)', async ({ page }) => {
  await blockMapTiles(page);
  await page.goto(`/kitchens/${kitchen.id}`);
  await expect(page.getByTestId('eta-range')).toContainText(/\d+–\d+ min/);

  await dishRow(page, first!.id).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dishRow(page, first!.id).getByTestId('cart-qty')).toHaveText('1');
  await dishRow(page, first!.id).getByRole('button', { name: 'One more' }).click();
  await expect(dishRow(page, first!.id).getByTestId('cart-qty')).toHaveText('2');
  await dishRow(page, second!.id).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toContainText('3 items');
  await expect(page.getByTestId('cart-bar')).toContainText(rupees(first!.priceRupees * 2 + second!.priceRupees));

  // A dish from another kitchen asks before replacing the cart; keeping it changes nothing (FR-002).
  await page.goto(`/kitchens/${other.id}`);
  await dishRow(page, otherDish.id).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Your cart has items from another kitchen.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Keep my cart' }).click();
  await expect(page.getByTestId('header-cart')).toContainText('3');

  // The cart shows the bill: item total + flat fee = grand total (FR-003).
  await page.getByTestId('header-cart').click();
  await expect(page).toHaveURL('/cart');
  const itemTotal = first!.priceRupees * 2 + second!.priceRupees;
  await expect(page.getByTestId('bill-item-total')).toHaveText(rupees(itemTotal));
  await expect(page.getByTestId('bill-delivery-fee')).toHaveText(rupees(30));
  await expect(page.getByTestId('bill-grand-total')).toHaveText(rupees(itemTotal + 30));

  // Sign in at checkout and come straight back with the same cart (FR-007).
  await page.getByRole('link', { name: 'Sign in to check out' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcart|\/login\?next=\/cart/);
  await page.getByLabel('Mobile number').fill(demoCustomer().phone);
  await page.getByRole('button', { name: 'Get code' }).click();
  await page.getByLabel('6-digit code').fill(demoCode());
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(2);
  await expect(page.getByRole('radio', { checked: true }).first()).toBeVisible();

  // UPI shows the demo sheet first; confirming places the order (FR-011).
  await page.getByRole('radio', { name: 'UPI' }).check();
  await page.getByRole('button', { name: /Place order/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toContainText('This is a demo. Nothing will be charged.');
  await sheet.getByRole('button', { name: 'Confirm payment' }).click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/#\d{4}/);
  await expect(page.getByTestId('payment')).toHaveText('Paid by UPI (demo)');
  await expect(page.getByTestId('expected-by')).toContainText('Expected by');
  await expect(page.getByTestId('header-cart')).not.toContainText(/\d/);

  // Every ongoing order is reachable from "My orders" (FR-024).
  await page.getByRole('link', { name: 'My orders' }).first().click();
  await expect(page.getByTestId('order-card').first()).toContainText('Placed');
});

test('a customer adds a map-pinned address with a voice note at checkout', async ({ page }) => {
  await blockMapTiles(page);
  await syntheticMicrophone(page);
  await signIn(page, '/login', demoCustomer().phone);
  await page.goto(`/kitchens/${kitchen.id}`);
  await dishRow(page, first!.id).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('cart-bar')).toBeVisible();
  await page.getByTestId('cart-bar').click();
  await page.getByRole('link', { name: 'Add a new address' }).click();
  await expect(page).toHaveURL('/addresses/new?next=/cart');

  // Step 1: search a place, check the address under the pin, continue (FR-053).
  await page.getByLabel('Search for a place').fill('bus');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('list', { name: 'Places found' }).getByRole('button').first().click();
  await expect(page.getByTestId('pin-address')).toContainText('Near', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: details, a voice note and a label (FR-054, FR-055).
  await page.getByLabel('House or door number, or house name').fill('Shop 12, Sagar Complex');
  await page.getByLabel('Landmark').fill('Opposite the bus stand');
  await page.getByRole('button', { name: 'Record a voice note' }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByTestId('voice-preview')).toBeVisible();
  await page.getByText('Work', { exact: true }).click();
  await page.getByRole('button', { name: 'Save address' }).click();

  await expect(page).toHaveURL('/cart');
  await expect(page.getByText('Shop 12, Sagar Complex')).toBeVisible();
});
