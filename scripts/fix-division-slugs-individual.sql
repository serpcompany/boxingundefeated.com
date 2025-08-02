-- Run each UPDATE statement individually in the Cloudflare D1 console

UPDATE divisions SET slug = 'light-flyweight' WHERE slug = 'lightflyweight';

UPDATE divisions SET slug = 'super-flyweight' WHERE slug = 'superflyweight';

UPDATE divisions SET slug = 'super-bantamweight' WHERE slug = 'superbantamweight';

UPDATE divisions SET slug = 'super-featherweight' WHERE slug = 'superfeatherweight';

UPDATE divisions SET slug = 'super-lightweight' WHERE slug = 'superlightweight';

UPDATE divisions SET slug = 'super-welterweight' WHERE slug = 'superwelterweight';

UPDATE divisions SET slug = 'super-middleweight' WHERE slug = 'supermiddleweight';

UPDATE divisions SET slug = 'light-heavyweight' WHERE slug = 'lightheavyweight';

-- After all updates, run this to verify:
SELECT id, slug, name FROM divisions ORDER BY id;