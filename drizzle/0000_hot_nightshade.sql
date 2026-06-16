CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'available' NOT NULL,
	`order_id` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`amount` real NOT NULL,
	`email` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`slip_trans_ref` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_slip_trans_ref_unique` ON `orders` (`slip_trans_ref`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`price` real NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
