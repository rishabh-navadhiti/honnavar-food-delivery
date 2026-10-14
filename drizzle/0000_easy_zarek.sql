CREATE TYPE "public"."surface" AS ENUM('customer', 'partner', 'agent', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('bicycle', 'two_wheeler', 'other');--> statement-breakpoint
CREATE TYPE "public"."actor_role" AS ENUM('admin', 'partner');--> statement-breakpoint
CREATE TYPE "public"."kitchen_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."kitchen_type" AS ENUM('restaurant', 'home_kitchen', 'cloud_kitchen');--> statement-breakpoint
CREATE TYPE "public"."verification_kind" AS ENUM('fssai_licence', 'hygiene_check');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(10) NOT NULL,
	"name" varchar(60) NOT NULL,
	CONSTRAINT "admins_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(10) NOT NULL,
	"name" varchar(60) NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"vehicle_reg" varchar(20),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(10) NOT NULL,
	"display_name" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" char(64) PRIMARY KEY NOT NULL,
	"surface" "surface" NOT NULL,
	"phone" varchar(10) NOT NULL,
	"subject_id" uuid NOT NULL,
	"kitchen_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sha256" char(64) NOT NULL,
	"small" "bytea" NOT NULL,
	"large" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "kitchen_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"phone" varchar(10) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_hours" (
	"kitchen_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"slot" smallint NOT NULL,
	"opens_min" smallint NOT NULL,
	"closes_min" smallint NOT NULL,
	CONSTRAINT "kitchen_hours_kitchen_id_weekday_slot_pk" PRIMARY KEY("kitchen_id","weekday","slot"),
	CONSTRAINT "kitchen_hours_weekday" CHECK ("kitchen_hours"."weekday" between 1 and 7),
	CONSTRAINT "kitchen_hours_slot" CHECK ("kitchen_hours"."slot" in (1, 2)),
	CONSTRAINT "kitchen_hours_opens" CHECK ("kitchen_hours"."opens_min" between 0 and 1439),
	CONSTRAINT "kitchen_hours_closes" CHECK ("kitchen_hours"."closes_min" between 1 and 1440),
	CONSTRAINT "kitchen_hours_order" CHECK ("kitchen_hours"."opens_min" < "kitchen_hours"."closes_min")
);
--> statement-breakpoint
CREATE TABLE "kitchen_signins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"phone" varchar(10) NOT NULL,
	"person_name" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_signins_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "kitchens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" varchar(80),
	"name_kn" varchar(80),
	"description_en" varchar(300),
	"description_kn" varchar(300),
	"type" "kitchen_type" NOT NULL,
	"pure_veg" boolean NOT NULL,
	"address" varchar(200) NOT NULL,
	"landmark" varchar(100) NOT NULL,
	"photo_image_id" uuid,
	"status" "kitchen_status" DEFAULT 'pending' NOT NULL,
	"suspension_reason" varchar(200),
	"closed_at" timestamp with time zone,
	"reopens_at" timestamp with time zone,
	"closure_updated_by_role" "actor_role",
	"closure_updated_by_phone" varchar(10),
	"closure_updated_at" timestamp with time zone,
	"hours_updated_by_role" "actor_role",
	"hours_updated_by_phone" varchar(10),
	"hours_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitchens_name_present" CHECK (coalesce(btrim("kitchens"."name_en"), '') <> '' or coalesce(btrim("kitchens"."name_kn"), '') <> ''),
	CONSTRAINT "kitchens_suspension_reason" CHECK ("kitchens"."status" <> 'suspended' or coalesce(btrim("kitchens"."suspension_reason"), '') <> '')
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"kitchen_id" uuid PRIMARY KEY NOT NULL,
	"kind" "verification_kind" NOT NULL,
	"reference" varchar(40) NOT NULL,
	"verified_by_admin_id" uuid NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name_en" varchar(80),
	"name_kn" varchar(80),
	"description_en" varchar(300),
	"description_kn" varchar(300),
	"price_rupees" integer NOT NULL,
	"is_veg" boolean NOT NULL,
	"photo_image_id" uuid,
	"available" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_by_role" "actor_role",
	"updated_by_phone" varchar(10),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dishes_name_present" CHECK (coalesce(btrim("dishes"."name_en"), '') <> '' or coalesce(btrim("dishes"."name_kn"), '') <> ''),
	CONSTRAINT "dishes_price_range" CHECK ("dishes"."price_rupees" between 1 and 100000)
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"name_en" varchar(60),
	"name_kn" varchar(60),
	"position" integer DEFAULT 0 NOT NULL,
	"updated_by_role" "actor_role",
	"updated_by_phone" varchar(10),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_name_present" CHECK (coalesce(btrim("menu_categories"."name_en"), '') <> '' or coalesce(btrim("menu_categories"."name_kn"), '') <> '')
);
--> statement-breakpoint
ALTER TABLE "kitchen_contacts" ADD CONSTRAINT "kitchen_contacts_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_hours" ADD CONSTRAINT "kitchen_hours_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_signins" ADD CONSTRAINT "kitchen_signins_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_photo_image_id_images_id_fk" FOREIGN KEY ("photo_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verified_by_admin_id_admins_id_fk" FOREIGN KEY ("verified_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_photo_image_id_images_id_fk" FOREIGN KEY ("photo_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_surface_subject_idx" ON "sessions" USING btree ("surface","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kitchen_contacts_one_primary" ON "kitchen_contacts" USING btree ("kitchen_id") WHERE "kitchen_contacts"."is_primary";