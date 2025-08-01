PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_boxers` (
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
	`proTotalBouts` integer,
	`proTotalRounds` integer,
	`amateurDebutDate` text,
	`amateurDivision` text,
	`amateurWins` integer,
	`amateurWinsByKnockout` integer,
	`amateurLosses` integer,
	`amateurLossesByKnockout` integer,
	`amateurDraws` integer,
	`amateurStatus` text,
	`amateurTotalBouts` integer,
	`amateurTotalRounds` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_boxers`("id", "boxrecId", "boxrecUrl", "boxrecWikiUrl", "slug", "name", "birthName", "nicknames", "avatarImage", "residence", "birthPlace", "dateOfBirth", "gender", "nationality", "height", "reach", "stance", "bio", "promoters", "trainers", "managers", "gym", "proDebutDate", "proDivision", "proWins", "proWinsByKnockout", "proLosses", "proLossesByKnockout", "proDraws", "proStatus", "proTotalBouts", "proTotalRounds", "amateurDebutDate", "amateurDivision", "amateurWins", "amateurWinsByKnockout", "amateurLosses", "amateurLossesByKnockout", "amateurDraws", "amateurStatus", "amateurTotalBouts", "amateurTotalRounds", "createdAt", "updatedAt") SELECT "id", "boxrecId", "boxrecUrl", "boxrecWikiUrl", "slug", "name", "birthName", "nicknames", "avatarImage", "residence", "birthPlace", "dateOfBirth", "gender", "nationality", "height", "reach", "stance", "bio", "promoters", "trainers", "managers", "gym", "proDebutDate", "proDivision", "proWins", "proWinsByKnockout", "proLosses", "proLossesByKnockout", "proDraws", "proStatus", "proTotalBouts", "proTotalRounds", "amateurDebutDate", "amateurDivision", "amateurWins", "amateurWinsByKnockout", "amateurLosses", "amateurLossesByKnockout", "amateurDraws", "amateurStatus", "amateurTotalBouts", "amateurTotalRounds", "createdAt", "updatedAt" FROM `boxers`;--> statement-breakpoint
DROP TABLE `boxers`;--> statement-breakpoint
ALTER TABLE `__new_boxers` RENAME TO `boxers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_boxrecId_unique` ON `boxers` (`boxrecId`);--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_boxrecUrl_unique` ON `boxers` (`boxrecUrl`);--> statement-breakpoint
CREATE UNIQUE INDEX `boxers_slug_unique` ON `boxers` (`slug`);--> statement-breakpoint
CREATE INDEX `boxersSlugIdx` ON `boxers` (`slug`);--> statement-breakpoint
CREATE INDEX `boxersBoxrecIdIdx` ON `boxers` (`boxrecId`);--> statement-breakpoint
CREATE INDEX `boxersNationalityIdx` ON `boxers` (`nationality`);--> statement-breakpoint
CREATE INDEX `boxersDivisionIdx` ON `boxers` (`proDivision`);--> statement-breakpoint
CREATE INDEX `boxersStatusIdx` ON `boxers` (`proStatus`);