import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { images } from './images';
import { actorRole, kitchens } from './kitchens';

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kitchenId: uuid('kitchen_id')
      .notNull()
      .references(() => kitchens.id, { onDelete: 'cascade' }),
    nameEn: varchar('name_en', { length: 60 }),
    nameKn: varchar('name_kn', { length: 60 }),
    position: integer('position').notNull().default(0),
    updatedByRole: actorRole('updated_by_role'),
    updatedByPhone: varchar('updated_by_phone', { length: 10 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'menu_categories_name_present',
      sql`coalesce(btrim(${t.nameEn}), '') <> '' or coalesce(btrim(${t.nameKn}), '') <> ''`,
    ),
  ],
);

export const dishes = pgTable(
  'dishes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kitchenId: uuid('kitchen_id')
      .notNull()
      .references(() => kitchens.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'restrict' }),
    nameEn: varchar('name_en', { length: 80 }),
    nameKn: varchar('name_kn', { length: 80 }),
    descriptionEn: varchar('description_en', { length: 300 }),
    descriptionKn: varchar('description_kn', { length: 300 }),
    priceRupees: integer('price_rupees').notNull(),
    isVeg: boolean('is_veg').notNull(),
    photoImageId: uuid('photo_image_id').references(() => images.id, { onDelete: 'set null' }),
    available: boolean('available').notNull().default(true),
    position: integer('position').notNull().default(0),
    updatedByRole: actorRole('updated_by_role'),
    updatedByPhone: varchar('updated_by_phone', { length: 10 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'dishes_name_present',
      sql`coalesce(btrim(${t.nameEn}), '') <> '' or coalesce(btrim(${t.nameKn}), '') <> ''`,
    ),
    check('dishes_price_range', sql`${t.priceRupees} between 1 and 100000`),
  ],
);
