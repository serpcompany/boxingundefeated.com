-- Drop all existing tables
DROP TABLE IF EXISTS boxerBouts;
DROP TABLE IF EXISTS boxers;
DROP TABLE IF EXISTS divisions;
DROP TABLE IF EXISTS _hub_migrations;
DROP TABLE IF EXISTS _cf_KV;
DROP TABLE IF EXISTS sqlite_sequence;

-- Recreate tables from migrations
-- From 0000_small_norman_osborn.sql
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

CREATE UNIQUE INDEX `boxers_boxrecId_unique` ON `boxers` (`boxrecId`);
CREATE UNIQUE INDEX `boxers_slug_unique` ON `boxers` (`slug`);
CREATE INDEX `boxersSlugIdx` ON `boxers` (`slug`);
CREATE INDEX `boxersBoxrecIdIdx` ON `boxers` (`boxrecId`);
CREATE INDEX `boxersNationalityIdx` ON `boxers` (`nationality`);
CREATE INDEX `boxersDivisionIdx` ON `boxers` (`proDivision`);
CREATE INDEX `boxersStatusIdx` ON `boxers` (`proStatus`);

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

CREATE INDEX `boxerBoutsBoxerIdIdx` ON `boxerBouts` (`boxerId`);
CREATE INDEX `boxerBoutsDateIdx` ON `boxerBouts` (`boutDate`);

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

CREATE UNIQUE INDEX `divisions_slug_unique` ON `divisions` (`slug`);
CREATE INDEX `divisionsSlugIdx` ON `divisions` (`slug`);