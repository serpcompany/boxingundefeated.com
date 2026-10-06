CREATE TABLE `dataset_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` text,
	`importing` integer DEFAULT false NOT NULL,
	`completed_at` text,
	CONSTRAINT "dataset_state_single_row" CHECK("dataset_state"."id" = 1),
	CONSTRAINT "dataset_state_importing_boolean" CHECK("dataset_state"."importing" IN (0, 1))
);
