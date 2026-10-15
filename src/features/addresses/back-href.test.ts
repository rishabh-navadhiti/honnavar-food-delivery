import { describe, expect, it } from 'vitest';
import { addressBackHref } from './back-href';

describe('addressBackHref', () => {
  it('goes back to a customer-surface next target', () => {
    expect(addressBackHref('/cart')).toBe('/cart');
    expect(addressBackHref('/account')).toBe('/account');
  });

  it('falls back to the address list for anything else', () => {
    expect(addressBackHref(undefined)).toBe('/addresses');
    expect(addressBackHref('')).toBe('/addresses');
    expect(addressBackHref('https://evil.example')).toBe('/addresses');
    expect(addressBackHref('//evil.example')).toBe('/addresses');
    expect(addressBackHref('/partner/orders')).toBe('/addresses');
  });
});
