import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Db } from '@/shared/db/client';
import {
  admins,
  agents,
  customerAddresses,
  customers,
  dishes,
  kitchenContacts,
  kitchenHours,
  kitchens,
  kitchenSignins,
  menuCategories,
  verifications,
} from '@/shared/db/schema';
import { storeImage } from '@/shared/images/store';
import { env } from '@/shared/env';
import { log } from '@/shared/log';
import { closureEnd } from '../kitchens/domain/closure';
import { WEEKDAYS } from '../kitchens/domain/hours';
import type { AgentActor, CustomerActor, OrderActor } from '../auth/actor-scope';
import { insertPlacedOrder } from '../orders/services/insert-order';
import { applyTransition, type OrderReason, type TransitionAction } from '../orders/services/transition';
import { catalogueHoursToWeek, catalogueSchema, seedSteps, type Catalogue, type SeedStep } from './catalogue-schema';
import { demoIds, deterministicId } from './ids';

export const CATALOGUE_PATH = path.resolve('seed/catalogue.json');
export const SEED_IMAGES_DIR = path.resolve('seed/images');

/** Read and validate the catalogue. Fails closed with the path of every problem. */
export function readCatalogue(file: string = CATALOGUE_PATH): Catalogue {
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const parsed = catalogueSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Invalid demo catalogue ${file}:\n${problems}`);
  }
  return parsed.data;
}

export type LoadSummary = Record<string, number> & { missingImages: number };

/**
 * Write the catalogue into an empty database through the same image path uploads use
 * (research R8, R15). Ids are derived from catalogue keys, so they are identical on every load.
 */
export async function loadCatalogue(
  database: Db,
  catalogue: Catalogue = readCatalogue(),
  options: { now?: Date; imagesDir?: string } = {},
): Promise<LoadSummary> {
  const now = options.now ?? new Date();
  const imagesDir = options.imagesDir ?? SEED_IMAGES_DIR;
  const firstAdmin = catalogue.admins[0]!;
  const adminStamp = { role: 'admin' as const, phone: firstAdmin.phone };
  const missing: string[] = [];
  let dishCount = 0;
  let categoryCount = 0;

  await database.transaction(async (tx) => {
    const photo = async (file: string | undefined): Promise<string | null> => {
      if (!file) return null;
      const full = path.join(imagesDir, file);
      if (!existsSync(full)) {
        missing.push(file);
        return null;
      }
      const stored = await storeImage(readFileSync(full), tx);
      if (!stored.ok) {
        log.warn('Seed image rejected', { file, code: stored.error.code });
        return null;
      }
      return stored.data.id;
    };

    await tx.insert(admins).values(catalogue.admins.map((a) => ({ id: demoIds.admin(a.key), name: a.name, phone: a.phone })));
    if (catalogue.agents.length > 0) {
      await tx.insert(agents).values(
        catalogue.agents.map((a) => ({
          id: demoIds.agent(a.key),
          name: a.name,
          phone: a.phone,
          vehicleType: a.vehicleType,
          vehicleReg: a.vehicleReg ?? null,
          active: a.active,
        })),
      );
    }
    if (catalogue.customers.length > 0) {
      await tx.insert(customers).values(
        catalogue.customers.map((c) => ({ id: demoIds.customer(c.key), phone: c.phone, displayName: c.displayName ?? null })),
      );
      const addresses = catalogue.customers.flatMap((c) =>
        c.addresses.map((a) => ({
          id: demoIds.address(c.key, a.key),
          customerId: demoIds.customer(c.key),
          label: a.label,
          house: a.house,
          street: a.street ?? null,
          landmark: a.landmark,
          riderNote: a.riderNote ?? null,
          lat: a.location.lat,
          lng: a.location.lng,
        })),
      );
      if (addresses.length > 0) await tx.insert(customerAddresses).values(addresses);
    }

    for (const k of catalogue.kitchens) {
      const kitchenId = demoIds.kitchen(k.key);
      const week = catalogueHoursToWeek(k.hours)!;
      const closedAt = k.temporarilyClosedAtReset ? now : null;
      await tx.insert(kitchens).values({
        id: kitchenId,
        nameEn: k.name.en ?? null,
        nameKn: k.name.kn ?? null,
        descriptionEn: k.description?.en ?? null,
        descriptionKn: k.description?.kn ?? null,
        type: k.type,
        pureVeg: k.pureVeg,
        address: k.address,
        landmark: k.landmark,
        locationLat: k.location.lat,
        locationLng: k.location.lng,
        prepMinutes: k.prepMinutes,
        photoImageId: await photo(k.image),
        status: k.status,
        suspensionReason: k.suspensionReason ?? null,
        closedAt,
        reopensAt: closedAt ? closureEnd(week, closedAt) : null,
        closureUpdatedByRole: closedAt ? adminStamp.role : null,
        closureUpdatedByPhone: closedAt ? adminStamp.phone : null,
        closureUpdatedAt: closedAt,
        hoursUpdatedByRole: adminStamp.role,
        hoursUpdatedByPhone: adminStamp.phone,
        hoursUpdatedAt: now,
      });

      await tx.insert(kitchenContacts).values(
        k.contacts.map((c, position) => ({
          id: demoIds.contact(k.key, c.phone),
          kitchenId,
          phone: c.phone,
          isPrimary: c.isPrimary,
          position,
        })),
      );
      await tx.insert(kitchenSignins).values(
        k.signins.map((s) => ({ id: demoIds.signin(k.key, s.phone), kitchenId, phone: s.phone, personName: s.personName })),
      );

      const hourRows = WEEKDAYS.flatMap((weekday) =>
        week[weekday].map((r, i) => ({ kitchenId, weekday, slot: i + 1, opensMin: r.opens, closesMin: r.closes })),
      );
      if (hourRows.length > 0) await tx.insert(kitchenHours).values(hourRows);

      if (k.verification) {
        await tx.insert(verifications).values({
          kitchenId,
          kind: k.verification.kind,
          reference: k.verification.reference,
          verifiedByAdminId: demoIds.admin(firstAdmin.key),
          verifiedAt: now,
        });
      }

      for (const [categoryPosition, c] of k.categories.entries()) {
        const categoryId = demoIds.category(k.key, c.key);
        await tx.insert(menuCategories).values({
          id: categoryId,
          kitchenId,
          nameEn: c.name.en ?? null,
          nameKn: c.name.kn ?? null,
          position: categoryPosition,
          updatedByRole: adminStamp.role,
          updatedByPhone: adminStamp.phone,
          updatedAt: now,
        });
        categoryCount += 1;
        for (const [dishPosition, d] of c.dishes.entries()) {
          await tx.insert(dishes).values({
            id: demoIds.dish(k.key, d.key),
            kitchenId,
            categoryId,
            nameEn: d.name.en ?? null,
            nameKn: d.name.kn ?? null,
            descriptionEn: d.description?.en ?? null,
            descriptionKn: d.description?.kn ?? null,
            priceRupees: d.priceRupees,
            isVeg: d.isVeg,
            available: d.available,
            photoImageId: await photo(d.image),
            position: dishPosition,
            updatedByRole: adminStamp.role,
            updatedByPhone: adminStamp.phone,
            updatedAt: now,
          });
          dishCount += 1;
        }
      }
    }
  });

  await loadOrders(database, catalogue, now);

  if (missing.length > 0) {
    log.warn('Seed images not found; placeholders will be shown', { count: missing.length, files: missing });
  }

  return {
    admins: catalogue.admins.length,
    agents: catalogue.agents.length,
    customers: catalogue.customers.length,
    kitchens: catalogue.kitchens.length,
    categories: categoryCount,
    dishes: dishCount,
    orders: catalogue.orders.length,
    missingImages: missing.length,
  };
}

const SEED_STEP_MINUTES = 4;

/**
 * Seed orders (research R15): each is inserted as Placed at `now − placedMinutesBeforeReset`, exactly
 * as checkout does, then walked to its status one step every 4 minutes through `applyTransition`,
 * so its events and messages are what a live run would produce. Never calls a geocoder.
 */
async function loadOrders(database: Db, catalogue: Catalogue, now: Date): Promise<void> {
  const firstAdmin = catalogue.admins[0]!;
  const admin: OrderActor = { role: 'admin', phone: firstAdmin.phone, adminId: demoIds.admin(firstAdmin.key) };

  for (const o of catalogue.orders) {
    const customer = catalogue.customers.find((c) => c.key === o.customer)!;
    const address = customer.addresses.find((a) => a.key === o.address)!;
    const kitchen = catalogue.kitchens.find((k) => k.key === o.kitchen)!;
    const dishByKey = new Map(kitchen.categories.flatMap((c) => c.dishes).map((d) => [d.key, d]));
    const placedAt = new Date(now.getTime() - o.placedMinutesBeforeReset * 60_000);
    const orderId = demoIds.order(o.key);
    const customerActor: CustomerActor = { role: 'customer', customerId: demoIds.customer(customer.key), phone: customer.phone };

    await database.transaction((tx) =>
      insertPlacedOrder(tx, {
        id: orderId,
        customerId: customerActor.customerId,
        customerPhone: customer.phone,
        kitchenId: demoIds.kitchen(kitchen.key),
        placeKey: deterministicId(`place:${o.key}`),
        paymentMethod: o.payment,
        items: o.items.map((item) => {
          const dish = dishByKey.get(item.dish)!;
          return {
            dishId: demoIds.dish(kitchen.key, dish.key),
            nameEn: dish.name.en ?? null,
            nameKn: dish.name.kn ?? null,
            isVeg: dish.isVeg,
            priceRupees: dish.priceRupees,
            quantity: item.quantity,
          };
        }),
        deliveryFee: env.DELIVERY_FEE_RUPEES,
        prepMinutes: kitchen.prepMinutes,
        deliveryMinutes: env.DELIVERY_MINUTES,
        address: {
          id: demoIds.address(customer.key, address.key),
          label: address.label,
          house: address.house,
          street: address.street ?? null,
          landmark: address.landmark,
          riderNote: address.riderNote ?? null,
          lat: address.location.lat,
          lng: address.location.lng,
          geocodedText: null,
          voiceNoteId: null,
        },
        placedAt,
      }),
    );

    const signin = kitchen.signins[0]!;
    const partner: OrderActor = {
      role: 'partner',
      phone: signin.phone,
      signinId: demoIds.signin(kitchen.key, signin.phone),
      kitchenId: demoIds.kitchen(kitchen.key),
    };
    const agentEntry = o.agent ? catalogue.agents.find((a) => a.key === o.agent)! : null;
    const agent: AgentActor | null = agentEntry
      ? { role: 'agent', agentId: demoIds.agent(agentEntry.key), phone: agentEntry.phone }
      : null;
    const reason = o.reason as OrderReason | undefined;

    const plan: Record<SeedStep, () => { action: TransitionAction; actor: OrderActor; reason?: OrderReason; note?: string }> = {
      accept: () => ({ action: { type: 'accept' }, actor: partner }),
      reject: () => ({ action: { type: 'reject' }, actor: partner, reason, note: o.reasonNote }),
      assign: () => ({ action: { type: 'assign', agentId: agent!.agentId }, actor: admin }),
      preparing: () => ({ action: { type: 'preparing' }, actor: partner }),
      ready: () => ({ action: { type: 'ready' }, actor: partner }),
      pickup: () => ({ action: { type: 'pickup' }, actor: agent! }),
      deliver: () => ({ action: { type: 'deliver', cashConfirmed: true }, actor: agent! }),
      cancel: () =>
        o.cancelledBy === 'admin'
          ? { action: { type: 'cancel' }, actor: admin, reason, note: o.reasonNote }
          : { action: { type: 'cancel' }, actor: customerActor },
    };
    for (const [index, step] of seedSteps(o).entries()) {
      const at = new Date(placedAt.getTime() + (index + 1) * SEED_STEP_MINUTES * 60_000);
      const result = await applyTransition({ orderId, now: at, ...plan[step]() }, database);
      if (!result.ok) throw new Error(`Seed order ${o.key}: step ${step} refused (${result.error.code})`);
    }
  }
}
