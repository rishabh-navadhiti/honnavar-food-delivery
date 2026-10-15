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
