ALTER TABLE `divisions` ADD `shortName` text;--> statement-breakpoint
CREATE INDEX `divisionsShortNameIdx` ON `divisions` (`shortName`);