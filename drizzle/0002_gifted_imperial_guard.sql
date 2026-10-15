ALTER TABLE "customer_addresses" ADD COLUMN "label_text" varchar(30);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "addr_label_text" varchar(30);