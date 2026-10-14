import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Db } from '@/shared/db/client';
import {
  admins,
  agents,
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
import { log } from '@/shared/log';
import { closureEnd } from '../kitchens/domain/closure';
import { WEEKDAYS } from '../kitchens/domain/hours';
import { catalogueHoursToWeek, catalogueSchema, type Catalogue } from './catalogue-schema';
import { demoIds } from './ids';

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
    missingImages: missing.length,
  };
}
