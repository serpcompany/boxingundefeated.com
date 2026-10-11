CREATE TABLE `photos` (
	`source_url` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`content_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`copied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
