CREATE TABLE `boxers` (
	`id` text PRIMARY KEY NOT NULL,
	`boxrecId` text NOT NULL,
	`boxrecUrl` text NOT NULL,
	`boxrecWikiUrl` text,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`birthName` text,
	`nicknames` text,
	`avatarImage` text,
	`residence` text,
	`birthPlace` text,
	`dateOfBirth` text,
	`gender` text,
	`nationality` text,
	`height` text,
	`reach` text,
	`stance` text,
	`bio` text,
	`promoters` text,
	`trainers` text,
	`managers` text,
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
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_boxrecId_unique` ON `boxers` (`boxrecId`);--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_slug_unique` ON `boxers` (`slug`);--> statement-breakpoint
CREATE INDEX `boxersSlugIdx` ON `boxers` (`slug`);--> statement-breakpoint
CREATE INDEX `boxersBoxrecIdIdx` ON `boxers` (`boxrecId`);--> statement-breakpoint
CREATE INDEX `boxersNationalityIdx` ON `boxers` (`nationality`);--> statement-breakpoint
CREATE INDEX `boxersDivisionIdx` ON `boxers` (`proDivision`);--> statement-breakpoint
CREATE INDEX `boxersStatusIdx` ON `boxers` (`proStatus`);--> statement-breakpoint
CREATE TABLE `boxerBouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`boxerId` text NOT NULL,
	`boxrecId` text,
	`boutDate` text NOT NULL,
	`opponentName` text NOT NULL,
	`opponentWeight` text,
	`opponentRecord` text,
	`eventName` text,
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
	FOREIGN KEY (`boxerId`) REFERENCES `boxers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boxerBoutsBoxerIdIdx` ON `boxerBouts` (`boxerId`);--> statement-breakpoint
CREATE INDEX `boxerBoutsDateIdx` ON `boxerBouts` (`boutDate`);--> statement-breakpoint
CREATE TABLE `divisions` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`alternativeNames` text,
	`weightLimitPounds` real NOT NULL,
	`weightLimitKilograms` real NOT NULL,
	`weightLimitStone` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_slug_unique` ON `divisions` (`slug`);--> statement-breakpoint
CREATE INDEX `divisionsSlugIdx` ON `divisions` (`slug`);