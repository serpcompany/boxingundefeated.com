CREATE TABLE `bouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`boxer_id` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`boxrec_id` text NOT NULL,
	`bout_date` text NOT NULL,
	`opponent_name` text NOT NULL,
	`opponent_boxer_id` integer,
	`opponent_weight` text,
	`opponent_record` text,
	`event_name` text,
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
	`result_round` text,
	`event_page_link` text,
	`bout_page_link` text NOT NULL,
	`scorecards_page_link` text,
	`title_fight` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`boxer_id`) REFERENCES `boxers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opponent_boxer_id`) REFERENCES `boxers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "bouts_ordinal_nonnegative" CHECK("bouts"."ordinal" >= 0),
	CONSTRAINT "bouts_title_fight_boolean" CHECK("bouts"."title_fight" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bouts_boxer_ordinal_unique` ON `bouts` (`boxer_id`,`ordinal`);--> statement-breakpoint
CREATE INDEX `bouts_opponent_boxer_id_idx` ON `bouts` (`opponent_boxer_id`);--> statement-breakpoint
CREATE TABLE `boxers` (
	`id` integer PRIMARY KEY NOT NULL,
	`boxrec_id` text NOT NULL,
	`boxrec_url` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`birth_name` text,
	`nicknames` text,
	`avatar_image` text,
	`residence` text,
	`birth_place` text,
	`date_of_birth` text,
	`gender` text,
	`nationality` text,
	`height` text,
	`reach` text,
	`stance` text,
	`bio` text,
	`promoters` text DEFAULT '[]' NOT NULL,
	`trainers` text DEFAULT '[]' NOT NULL,
	`managers` text DEFAULT '[]' NOT NULL,
	`gym` text,
	`pro_debut_date` text,
	`pro_division` text,
	`pro_wins` integer DEFAULT 0 NOT NULL,
	`pro_wins_by_knockout` integer DEFAULT 0 NOT NULL,
	`pro_losses` integer DEFAULT 0 NOT NULL,
	`pro_losses_by_knockout` integer DEFAULT 0 NOT NULL,
	`pro_draws` integer DEFAULT 0 NOT NULL,
	`pro_total_bouts` integer DEFAULT 0 NOT NULL,
	`pro_total_rounds` integer,
	`pro_status` text,
	`created_at` text,
	`updated_at` text,
	`imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pro_division`) REFERENCES `divisions`(`pro_division`) ON UPDATE cascade ON DELETE no action,
	CONSTRAINT "boxers_record_nonnegative" CHECK("boxers"."pro_wins" >= 0 AND "boxers"."pro_wins_by_knockout" >= 0 AND "boxers"."pro_losses" >= 0 AND "boxers"."pro_losses_by_knockout" >= 0 AND "boxers"."pro_draws" >= 0 AND "boxers"."pro_total_bouts" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_boxrec_id_unique` ON `boxers` (`boxrec_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_slug_unique` ON `boxers` (`slug`);--> statement-breakpoint
CREATE INDEX `boxers_directory_idx` ON `boxers` ("pro_wins" DESC,"pro_total_bouts" DESC,"name" COLLATE NOCASE);--> statement-breakpoint
CREATE INDEX `boxers_division_directory_idx` ON `boxers` (`pro_division`,"pro_wins" DESC,"pro_total_bouts" DESC,"name" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `divisions` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pro_division` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_pro_division_unique` ON `divisions` (`pro_division`);--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_sort_order_unique` ON `divisions` (`sort_order`);