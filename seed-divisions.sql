-- Seed divisions data
INSERT OR REPLACE INTO divisions (id, slug, name, shortName, weightLimitPounds, weightLimitKilograms, weightLimitStone, alternativeNames) VALUES
('minimumweight', 'minimumweight', 'Minimumweight', 'minimum', 105, 47.627, '7st 7lbs', '["Mini Flyweight"]'),
('light-flyweight', 'light-flyweight', 'Light Flyweight', 'light fly', 108, 48.988, '7st 10lbs', '["Junior Flyweight"]'),
('flyweight', 'flyweight', 'Flyweight', 'fly', 112, 50.802, '8st', NULL),
('super-flyweight', 'super-flyweight', 'Super Flyweight', 'super fly', 115, 52.163, '8st 3lbs', '["Junior Bantamweight"]'),
('bantamweight', 'bantamweight', 'Bantamweight', 'bantam', 118, 53.525, '8st 6lbs', NULL),
('super-bantamweight', 'super-bantamweight', 'Super Bantamweight', 'super bantam', 122, 55.338, '8st 10lbs', '["Junior Featherweight"]'),
('featherweight', 'featherweight', 'Featherweight', 'feather', 126, 57.153, '9st', NULL),
('super-featherweight', 'super-featherweight', 'Super Featherweight', 'super feather', 130, 58.967, '9st 4lbs', '["Junior Lightweight"]'),
('lightweight', 'lightweight', 'Lightweight', 'light', 135, 61.235, '9st 9lbs', NULL),
('super-lightweight', 'super-lightweight', 'Super Lightweight', 'super light', 140, 63.503, '10st', '["Junior Welterweight"]'),
('welterweight', 'welterweight', 'Welterweight', 'welter', 147, 66.678, '10st 7lbs', NULL),
('super-welterweight', 'super-welterweight', 'Super Welterweight', 'super welter', 154, 69.85, '11st', '["Junior Middleweight"]'),
('middleweight', 'middleweight', 'Middleweight', 'middle', 160, 72.574, '11st 6lbs', NULL),
('super-middleweight', 'super-middleweight', 'Super Middleweight', 'super middle', 168, 76.203, '12st', NULL),
('light-heavyweight', 'light-heavyweight', 'Light Heavyweight', 'light heavy', 175, 79.378, '12st 7lbs', NULL),
('cruiserweight', 'cruiserweight', 'Cruiserweight', 'cruiser', 200, 90.718, '14st 4lbs', '["Junior Heavyweight"]'),
('heavyweight', 'heavyweight', 'Heavyweight', 'heavy', 201, 90.719, '14st 5lbs', NULL);
