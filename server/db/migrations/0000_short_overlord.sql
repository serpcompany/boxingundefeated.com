CREATE TABLE `boxer` (
	`id` text PRIMARY KEY NOT NULL,
	`boxrecId` text NOT NULL,
	`boxrecUrl` text NOT NULL,
	`slug` text NOT NULL,
	`fullName` text NOT NULL,
	`birthName` text,
	`nickname` text,
	`gender` text,
	`avatarImage` text,
	`residence` text,
	`birthPlace` text,
	`dateOfBirth` text,
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
	`proDebutDate` text,
	`proDivision` text,
	`proWins` integer DEFAULT 0 NOT NULL,
	`proWinsByKnockout` integer DEFAULT 0 NOT NULL,
	`proLosses` integer DEFAULT 0 NOT NULL,
	`proLossesByKnockout` integer DEFAULT 0 NOT NULL,
	`proDraws` integer DEFAULT 0 NOT NULL,
	`proStatus` text,
	`proTotalBouts` integer DEFAULT 0 NOT NULL,
	`proTotalRounds` integer DEFAULT 0 NOT NULL,
	`amateurDebutDate` text,
	`amateurDivision` text,
	`amateurWins` integer DEFAULT 0 NOT NULL,
	`amateurWinsByKnockout` integer DEFAULT 0 NOT NULL,
	`amateurLosses` integer DEFAULT 0 NOT NULL,
	`amateurLossesByKnockout` integer DEFAULT 0 NOT NULL,
	`amateurDraws` integer DEFAULT 0 NOT NULL,
	`amateurStatus` text,
	`amateurTotalBouts` integer DEFAULT 0 NOT NULL,
	`amateurTotalRounds` integer DEFAULT 0 NOT NULL,
	`isChampion` integer,
	`ranking` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boxer_boxrecId_unique` ON `boxer` (`boxrecId`);--> statement-breakpoint
CREATE UNIQUE INDEX `boxer_slug_unique` ON `boxer` (`slug`);--> statement-breakpoint
CREATE INDEX `boxer_slug_idx` ON `boxer` (`slug`);--> statement-breakpoint
CREATE INDEX `boxer_boxrec_id_idx` ON `boxer` (`boxrecId`);--> statement-breakpoint
CREATE INDEX `boxer_nationality_idx` ON `boxer` (`nationality`);--> statement-breakpoint
CREATE INDEX `boxer_division_idx` ON `boxer` (`proDivision`);--> statement-breakpoint
CREATE TABLE `boxer_bouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`boxerId` text NOT NULL,
	`boutDate` text NOT NULL,
	`opponentName` text NOT NULL,
	`opponentWeight` text,
	`opponentRecord` text,
	`venueName` text,
	`refereeName` text,
	`judge1Name` text,
	`judge1Score` text,
	`judge2Name` text,
	`judge2Score` text,
	`judge3Name` text,
	`judge3Score` text,
	`numRoundsScheduled` integer,
	`result` text NOT NULL,
	`resultMethod` text,
	`resultRound` integer,
	`eventPageLink` text,
	`boutPageLink` text,
	`scorecardsPageLink` text,
	`titleFight` integer DEFAULT false,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`boxerId`) REFERENCES `boxer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boxer_bouts_boxer_id_idx` ON `boxer_bouts` (`boxerId`);--> statement-breakpoint
CREATE INDEX `boxer_bouts_date_idx` ON `boxer_bouts` (`boutDate`);--> statement-breakpoint
CREATE TABLE `division` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`alternativeNames` text,
	`weightLimitPounds` real NOT NULL,
	`description` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `division_slug_unique` ON `division` (`slug`);--> statement-breakpoint
CREATE INDEX `division_slug_idx` ON `division` (`slug`);