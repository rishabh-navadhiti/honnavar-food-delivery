CREATE TYPE "public"."address_label" AS ENUM('home', 'work', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_actor" AS ENUM('customer', 'partner', 'agent', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."order_event_kind" AS ENUM('placed', 'accepted', 'rejected', 'preparing', 'ready', 'assigned', 'reassigned', 'picked_up', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_reason" AS ENUM('kitchen_busy', 'item_unavailable', 'kitchen_closing', 'kitchen_no_response', 'customer_request', 'kitchen_issue', 'no_agent', 'delivery_problem', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('placed', 'accepted', 'rejected', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cod', 'upi_demo');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('order_placed', 'order_accepted', 'order_rejected', 'order_preparing', 'order_picked_up', 'order_delivered', 'order_cancelled', 'kitchen_new_order', 'kitchen_agent_assigned', 'kitchen_order_cancelled', 'agent_assigned', 'agent_unassigned', 'agent_order_cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_recipient" AS ENUM('customer', 'kitchen', 'agent');--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "audio_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sha256" char(64) NOT NULL,
	"mime" varchar(40) NOT NULL,
	"bytes" "bytea" NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audio_clips_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" "address_label" NOT NULL,
	"house" varchar(100) NOT NULL,
	"street" varchar(150),
	"landmark" varchar(100) NOT NULL,
	"rider_note" varchar(200),
	"voice_note_id" uuid,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"geocoded_text" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_addresses_lat" CHECK ("customer_addresses"."lat" between 6 and 37),
	CONSTRAINT "customer_addresses_lng" CHECK ("customer_addresses"."lng" between 68 and 98)
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "order_event_kind" NOT NULL,
	"actor" "order_actor" NOT NULL,
	"actor_phone" varchar(10),
	"agent_id" uuid,
	"previous_agent_id" uuid,
	"reason" "order_reason",
	"reason_note" varchar(200),
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"dish_id" uuid,
	"name_en" varchar(80),
	"name_kn" varchar(80),
	"is_veg" boolean NOT NULL,
	"price_rupees" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"line_total" integer NOT NULL,
	CONSTRAINT "order_items_order_id_position_pk" PRIMARY KEY("order_id","position"),
	CONSTRAINT "order_items_name_present" CHECK (coalesce(btrim("order_items"."name_en"), '') <> '' or coalesce(btrim("order_items"."name_kn"), '') <> ''),
	CONSTRAINT "order_items_price" CHECK ("order_items"."price_rupees" between 1 and 100000),
	CONSTRAINT "order_items_quantity" CHECK ("order_items"."quantity" between 1 and 20),
	CONSTRAINT "order_items_line_total" CHECK ("order_items"."line_total" = "order_items"."price_rupees" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" integer DEFAULT nextval('order_number_seq') NOT NULL,
	"customer_id" uuid NOT NULL,
	"kitchen_id" uuid NOT NULL,
	"place_key" uuid NOT NULL,
	"status" "order_status" DEFAULT 'placed' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_reference" varchar(40),
	"item_total" integer NOT NULL,
	"delivery_fee" integer NOT NULL,
	"grand_total" integer NOT NULL,
	"expected_at" timestamp with time zone NOT NULL,
	"agent_id" uuid,
	"assigned_at" timestamp with time zone,
	"reason" "order_reason",
	"reason_note" varchar(200),
	"cash_collected" integer,
	"address_id" uuid,
	"addr_label" "address_label" NOT NULL,
	"addr_house" varchar(100) NOT NULL,
	"addr_street" varchar(150),
	"addr_landmark" varchar(100) NOT NULL,
	"addr_rider_note" varchar(200),
	"addr_lat" numeric(9, 6) NOT NULL,
	"addr_lng" numeric(9, 6) NOT NULL,
	"addr_geocoded_text" varchar(300),
	"addr_voice_note_id" uuid,
	"placed_at" timestamp with time zone NOT NULL,
	"status_changed_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no"),
	CONSTRAINT "orders_totals" CHECK ("orders"."grand_total" = "orders"."item_total" + "orders"."delivery_fee" and "orders"."item_total" >= 0 and "orders"."delivery_fee" >= 0),
	CONSTRAINT "orders_rejected_reason" CHECK ("orders"."status" <> 'rejected' or "orders"."reason" is not null),
	CONSTRAINT "orders_other_note" CHECK ("orders"."reason" is distinct from 'other' or coalesce(btrim("orders"."reason_note"), '') <> ''),
	CONSTRAINT "orders_cash" CHECK ("orders"."cash_collected" is null or "orders"."cash_collected" = "orders"."grand_total"),
	CONSTRAINT "orders_agent_absent" CHECK ("orders"."status" not in ('placed', 'rejected') or "orders"."agent_id" is null),
	CONSTRAINT "orders_agent_present" CHECK ("orders"."status" not in ('picked_up', 'delivered') or "orders"."agent_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient" "message_recipient" NOT NULL,
	"customer_id" uuid,
	"kitchen_id" uuid,
	"agent_id" uuid,
	"order_id" uuid NOT NULL,
	"kind" "message_kind" NOT NULL,
	"params" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "messages_one_recipient" CHECK (("messages"."recipient" = 'customer' and "messages"."customer_id" is not null and "messages"."kitchen_id" is null and "messages"."agent_id" is null)
        or ("messages"."recipient" = 'kitchen' and "messages"."kitchen_id" is not null and "messages"."customer_id" is null and "messages"."agent_id" is null)
        or ("messages"."recipient" = 'agent' and "messages"."agent_id" is not null and "messages"."customer_id" is null and "messages"."kitchen_id" is null))
);
--> statement-breakpoint
ALTER TABLE "kitchens" ADD COLUMN "location_lat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "kitchens" ADD COLUMN "location_lng" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "kitchens" ADD COLUMN "prep_minutes" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_voice_note_id_audio_clips_id_fk" FOREIGN KEY ("voice_note_id") REFERENCES "public"."audio_clips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_previous_agent_id_agents_id_fk" FOREIGN KEY ("previous_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_customer_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_addr_voice_note_id_audio_clips_id_fk" FOREIGN KEY ("addr_voice_note_id") REFERENCES "public"."audio_clips"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_events_order_at_idx" ON "order_events" USING btree ("order_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_customer_place_key" ON "orders" USING btree ("customer_id","place_key");--> statement-breakpoint
CREATE INDEX "orders_kitchen_placed_idx" ON "orders" USING btree ("kitchen_id","placed_at");--> statement-breakpoint
CREATE INDEX "orders_customer_placed_idx" ON "orders" USING btree ("customer_id","placed_at");--> statement-breakpoint
CREATE INDEX "orders_agent_idx" ON "orders" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_placed_waiting_idx" ON "orders" USING btree ("placed_at") WHERE "orders"."status" = 'placed';--> statement-breakpoint
CREATE INDEX "messages_customer_idx" ON "messages" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_kitchen_idx" ON "messages" USING btree ("kitchen_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_agent_idx" ON "messages" USING btree ("agent_id","created_at");--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_location_pair" CHECK (("kitchens"."location_lat" is null) = ("kitchens"."location_lng" is null));--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_location_range" CHECK ("kitchens"."location_lat" is null or ("kitchens"."location_lat" between 6 and 37 and "kitchens"."location_lng" between 68 and 98));--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_prep_minutes" CHECK ("kitchens"."prep_minutes" between 5 and 120);