import { beforeEach, describe, expect, it } from 'vitest';
import { adminActor, partnerActor } from '@/shared/db/test/actors';
import { makeKitchen, truncateAll } from '@/shared/db/test/helpers';
import { setAgentActive } from './agents/services/agents';
import { setKitchenPhoto, updateKitchenProfile } from './kitchens/services/admin';
import { closeTemporarily, reopen, saveHours } from './kitchens/services/operations';
import { removeSignin } from './kitchens/services/signins';
import { recordVerification } from './kitchens/services/verification';
import { deleteCategory, reorderCategories } from './menu/services/categories';
import { deleteDish, reorderDishes, setDishAvailable } from './menu/services/dishes';

beforeEach(truncateAll);

const BAD = 'not-a-uuid';
const profile = {
  name: { en: 'Kitchen' },
  type: 'restaurant' as const,
  pureVeg: false,
  address: 'Main Road',
  landmark: 'Bus stand',
  contacts: [{ phone: '9000009001', isPrimary: true }],
};

/** Constitution V: malformed input fails closed as `invalid`, never reaching the database. */
describe('malformed ids are rejected as invalid', () => {
  it('in kitchen operations (admin naming a kitchen)', async () => {
    const admin = await adminActor();
    for (const result of [
      await closeTemporarily(admin, { kitchenId: BAD }),
      await reopen(admin, { kitchenId: BAD }),
      await saveHours(admin, { kitchenId: BAD, hours: {} }),
    ]) {
      expect(result.ok || result.error.code).toBe('invalid');
    }
  });

  it('in menu operations', async () => {
    const kitchen = await makeKitchen();
    const partner = await partnerActor(kitchen.id);
    for (const result of [
      await deleteCategory(partner, { id: BAD }),
      await reorderCategories(partner, { ids: [BAD] }),
      await setDishAvailable(partner, { id: BAD, available: false }),
      await deleteDish(partner, { id: BAD }),
      await reorderDishes(partner, { categoryId: BAD, ids: [] }),
    ]) {
      expect(result.ok || result.error.code).toBe('invalid');
    }
  });

  it('in admin kitchen, sign-in, verification and agent operations', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen();
    for (const result of [
      await updateKitchenProfile(admin, { ...profile, kitchenId: BAD }),
      await setKitchenPhoto(admin, { kitchenId: BAD, photo: null }),
      await removeSignin(admin, { kitchenId: kitchen.id, signinId: BAD }),
      await removeSignin(admin, { kitchenId: BAD, signinId: kitchen.id }),
      await recordVerification(admin, { kitchenId: BAD, kind: 'fssai_licence', reference: '12345678901234' }),
      await recordVerification(admin, { kitchenId: kitchen.id, kind: 'bogus' as 'fssai_licence', reference: '12345678901234' }),
      await setAgentActive(admin, { id: BAD, active: false }),
    ]) {
      expect(result.ok || result.error.code).toBe('invalid');
    }
  });
});

/** 002: every ordering service and route handler fails closed on malformed input. */
describe('malformed ordering input is rejected as invalid (002)', () => {
  it('in cart, address, place and reorder services', async () => {
    const { customerActor } = await import('@/shared/db/test/actors');
    const { addToCart, setCartQuantity } = await import('./cart/services/cart');
    const { saveAddress, deleteAddress } = await import('./addresses/services/addresses');
    const { placeOrder } = await import('./orders/services/place');
    const { cancelOrderByCustomer, reorder } = await import('./orders/services/customer');
    const customer = await customerActor();
    const now = new Date();
    const cart = { v: 1 as const, kitchenId: crypto.randomUUID(), lines: [{ dishId: crypto.randomUUID(), qty: 1 }] };
    for (const result of [
      await addToCart(null, { dishId: BAD }, now),
      setCartQuantity(cart, { dishId: BAD, qty: 1 }),
      setCartQuantity(cart, { dishId: cart.lines[0]!.dishId, qty: -1 }),
      await saveAddress(customer, { id: BAD, label: 'home', house: 'A', landmark: 'B', lat: 14.2, lng: 74.4 }),
      await saveAddress(customer, { label: 'home', house: 'A', landmark: 'B', lat: 'north', lng: 74.4 }),
      await deleteAddress(customer, { id: BAD }),
      await placeOrder(customer, { placeKey: BAD, addressId: crypto.randomUUID(), paymentMethod: 'cod', seenPrices: '{}' }, cart, now),
      await placeOrder(customer, { placeKey: crypto.randomUUID(), addressId: BAD, paymentMethod: 'cod', seenPrices: '{}' }, cart, now),
      await placeOrder(customer, { placeKey: crypto.randomUUID(), addressId: crypto.randomUUID(), paymentMethod: 'cheque', seenPrices: '{}' }, cart, now),
      await placeOrder(customer, { placeKey: crypto.randomUUID(), addressId: crypto.randomUUID(), paymentMethod: 'cod', seenPrices: 'oops' }, cart, now),
      await cancelOrderByCustomer(customer, { orderId: BAD }, now),
      await reorder(customer, { orderId: BAD }, null),
    ]) {
      expect(result.ok || result.error.code).toBe('invalid');
    }
  });

  it('in partner, admin and agent order services', async () => {
    const { agentActor } = await import('@/shared/db/test/actors');
    const { acceptOrder, markPreparing, markReady, rejectOrder } = await import('./orders/services/partner');
    const { assignAgent, cancelOrderByAdmin } = await import('./orders/services/admin');
    const { markDelivered, markPickedUp } = await import('./orders/services/agent');
    const kitchen = await makeKitchen();
    const partner = await partnerActor(kitchen.id);
    const admin = await adminActor();
    const agent = await agentActor();
    const now = new Date();
    for (const result of [
      await acceptOrder(partner, { orderId: BAD }, now),
      await markPreparing(partner, { orderId: BAD }, now),
      await markReady(partner, { orderId: BAD }, now),
      await rejectOrder(partner, { orderId: BAD, reason: 'kitchen_busy' }, now),
      await rejectOrder(partner, { orderId: crypto.randomUUID(), reason: 'bogus' }, now),
      await assignAgent(admin, { orderId: BAD, agentId: crypto.randomUUID() }, now),
      await assignAgent(admin, { orderId: crypto.randomUUID(), agentId: BAD }, now),
      await cancelOrderByAdmin(admin, { orderId: BAD, reason: 'no_agent' }, now),
      await cancelOrderByAdmin(admin, { orderId: crypto.randomUUID(), reason: 'kitchen_busy' }, now),
      await markPickedUp(agent, { orderId: BAD }, now),
      await markDelivered(agent, { orderId: BAD, cashCollected: 'true' }, now),
    ]) {
      expect(result.ok || result.error.code).toBe('invalid');
    }
  });

  it('in the geo, voice-note and new-order feed route handlers', async () => {
    const { customerActor } = await import('@/shared/db/test/actors');
    const { handleGeoReverse, handleGeoSearch, handleVoiceNote } = await import('./addresses/handlers');
    const customer = await customerActor();
    const url = (path: string) => new URL(`http://localhost${path}`);
    expect((await handleGeoSearch(url('/api/geo/search?q=%20%20'), { customer })).status).toBe(400);
    expect((await handleGeoReverse(url('/api/geo/reverse?lat=14.2'), { customer })).status).toBe(400);
    expect((await handleGeoReverse(url('/api/geo/reverse?lat=14.2&lng=74.4&locale=xx'), { customer })).status).toBe(400);
    expect((await handleVoiceNote('../../etc/passwd', { admin: await adminActor() })).status).toBe(404);
  });
});
