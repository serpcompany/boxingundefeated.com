CREATE TABLE `boxer` (
	`id` text PRIMARY KEY NOT NULL,
	`boxrec_id` text NOT NULL,
	`boxrec_url` text NOT NULL,
	`slug` text NOT NULL,
	`full_name` text NOT NULL,
	`birth_name` text,
	`nickname` text,
	`gender` text,
	`avatar_image` text,
	`residence` text,
	`birth_place` text,
	`date_of_birth` text,
	`nationality` text,
	`height` text,
	`reach` text,
	`weight` text,
	`stance` text,
	`bio` text,
	`promoter` text,
	`trainer` text,
	`manager` text,
	`gym` text,
	`pro_debut_date` text,
	`pro_division` text,
	`pro_wins` integer DEFAULT 0 NOT NULL,
	`pro_wins_by_knockout` integer DEFAULT 0 NOT NULL,
	`pro_losses` integer DEFAULT 0 NOT NULL,
	`pro_losses_by_knockout` integer DEFAULT 0 NOT NULL,
	`pro_draws` integer DEFAULT 0 NOT NULL,
	`pro_status` text,
	`pro_total_bouts` integer DEFAULT 0 NOT NULL,
	`pro_total_rounds` integer DEFAULT 0 NOT NULL,
	`amateur_debut_date` text,
	`amateur_division` text,
	`amateur_wins` integer DEFAULT 0 NOT NULL,
	`amateur_wins_by_knockout` integer DEFAULT 0 NOT NULL,
	`amateur_losses` integer DEFAULT 0 NOT NULL,
	`amateur_losses_by_knockout` integer DEFAULT 0 NOT NULL,
	`amateur_draws` integer DEFAULT 0 NOT NULL,
	`amateur_status` text,
	`amateur_total_bouts` integer DEFAULT 0 NOT NULL,
	`amateur_total_rounds` integer DEFAULT 0 NOT NULL,
	`is_champion` integer,
	`ranking` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boxer_boxrecId_unique` ON `boxer` (`boxrec_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `boxer_slug_unique` ON `boxer` (`slug`);--> statement-breakpoint
CREATE INDEX `boxer_slug_idx` ON `boxer` (`slug`);--> statement-breakpoint
CREATE INDEX `boxer_boxrec_id_idx` ON `boxer` (`boxrec_id`);--> statement-breakpoint
CREATE INDEX `boxer_nationality_idx` ON `boxer` (`nationality`);--> statement-breakpoint
CREATE INDEX `boxer_division_idx` ON `boxer` (`pro_division`);--> statement-breakpoint
CREATE INDEX `boxer_status_idx` ON `boxer` (`pro_status`);--> statement-breakpoint
CREATE TABLE `boxer_bouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`boxer_id` text NOT NULL,
	`bout_date` text NOT NULL,
	`opponent_name` text NOT NULL,
	`opponent_weight` text,
	`opponent_record` text,
	`venue_name` text,
	`referee_name` text,
	`judge1_name` text,
	`judge1_score` text,
	`judge2_name` text,
	`judge2_score` text,
	`judge3_name` text,
	`judge3_score` text,
	`num_rounds_scheduled` integer,
	`result` text NOT NULL,
	`result_method` text,
	`result_round` integer,
	`event_page_link` text,
	`bout_page_link` text,
	`scorecards_page_link` text,
	`title_fight` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`boxer_id`) REFERENCES `boxer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boxer_bouts_boxer_id_idx` ON `boxer_bouts` (`boxer_id`);--> statement-breakpoint
CREATE INDEX `boxer_bouts_date_idx` ON `boxer_bouts` (`bout_date`);--> statement-breakpoint
CREATE TABLE `division` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`alternative_names` text,
	`weight_limit_pounds` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `division_slug_unique` ON `division` (`slug`);--> statement-breakpoint
CREATE INDEX `division_slug_idx` ON `division` (`slug`);