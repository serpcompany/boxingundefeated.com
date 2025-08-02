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
CREATE UNIQUE INDEX `boxers_boxrecId_unique` ON `boxers` (`boxrecId`);
CREATE UNIQUE INDEX `boxers_boxrecUrl_unique` ON `boxers` (`boxrecUrl`);
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
CREATE TABLE sqlite_sequence(name,seq);
CREATE INDEX `boxerBoutsBoxerIdIdx` ON `boxerBouts` (`boxerId`);
CREATE INDEX `boxerBoutsDateIdx` ON `boxerBouts` (`boutDate`);
CREATE UNIQUE INDEX `uniqueBoxerBout` ON `boxerBouts` (`boxerId`,`boutPageLink`);
CREATE TABLE `divisions` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`shortName` text,
	`alternativeNames` text,
	`weightLimitPounds` real NOT NULL,
	`weightLimitKilograms` real NOT NULL,
	`weightLimitStone` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `divisions_slug_unique` ON `divisions` (`slug`);
CREATE INDEX `divisionsSlugIdx` ON `divisions` (`slug`);
CREATE INDEX `divisionsShortNameIdx` ON `divisions` (`shortName`);
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			);
CREATE TABLE _hub_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE _cf_METADATA (
        key INTEGER PRIMARY KEY,
        value BLOB
      );
