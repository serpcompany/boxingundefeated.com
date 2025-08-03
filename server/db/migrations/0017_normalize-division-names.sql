-- Normalize division names to match divisions table
-- This fixes the inconsistency between lowercase division names and proper case

UPDATE boxers 
SET proDivision = CASE 
  WHEN proDivision = 'heavyweight' THEN 'Heavyweight'
  WHEN proDivision = 'cruiserweight' THEN 'Cruiserweight'
  WHEN proDivision = 'lightheavyweight' THEN 'Light Heavyweight'
  WHEN proDivision = 'supermiddleweight' THEN 'Super Middleweight'
  WHEN proDivision = 'middleweight' THEN 'Middleweight'
  WHEN proDivision = 'superwelterweight' THEN 'Super Welterweight'
  WHEN proDivision = 'welterweight' THEN 'Welterweight'
  WHEN proDivision = 'superlightweight' THEN 'Super Lightweight'
  WHEN proDivision = 'lightweight' THEN 'Lightweight'
  WHEN proDivision = 'superfeatherweight' THEN 'Super Featherweight'
  WHEN proDivision = 'featherweight' THEN 'Featherweight'
  WHEN proDivision = 'superbantamweight' THEN 'Super Bantamweight'
  WHEN proDivision = 'bantamweight' THEN 'Bantamweight'
  WHEN proDivision = 'superflyweight' THEN 'Super Flyweight'
  WHEN proDivision = 'flyweight' THEN 'Flyweight'
  WHEN proDivision = 'lightflyweight' THEN 'Light Flyweight'
  WHEN proDivision = 'minimumweight' THEN 'Minimumweight'
  ELSE proDivision
END
WHERE proDivision IS NOT NULL;

-- Also normalize amateurDivision if needed
UPDATE boxers 
SET amateurDivision = CASE 
  WHEN amateurDivision = 'heavyweight' THEN 'Heavyweight'
  WHEN amateurDivision = 'cruiserweight' THEN 'Cruiserweight'
  WHEN amateurDivision = 'lightheavyweight' THEN 'Light Heavyweight'
  WHEN amateurDivision = 'supermiddleweight' THEN 'Super Middleweight'
  WHEN amateurDivision = 'middleweight' THEN 'Middleweight'
  WHEN amateurDivision = 'superwelterweight' THEN 'Super Welterweight'
  WHEN amateurDivision = 'welterweight' THEN 'Welterweight'
  WHEN amateurDivision = 'superlightweight' THEN 'Super Lightweight'
  WHEN amateurDivision = 'lightweight' THEN 'Lightweight'
  WHEN amateurDivision = 'superfeatherweight' THEN 'Super Featherweight'
  WHEN amateurDivision = 'featherweight' THEN 'Featherweight'
  WHEN amateurDivision = 'superbantamweight' THEN 'Super Bantamweight'
  WHEN amateurDivision = 'bantamweight' THEN 'Bantamweight'
  WHEN amateurDivision = 'superflyweight' THEN 'Super Flyweight'
  WHEN amateurDivision = 'flyweight' THEN 'Flyweight'
  WHEN amateurDivision = 'lightflyweight' THEN 'Light Flyweight'
  WHEN amateurDivision = 'minimumweight' THEN 'Minimumweight'
  ELSE amateurDivision
END
WHERE amateurDivision IS NOT NULL;