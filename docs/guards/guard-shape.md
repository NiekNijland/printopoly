# Guard: guard-shape

`GuardShapeGuard` beslist de vorm van een guard: een detectorklasse in `tests/Support/Architecture` met een dunne test in `tests/Guards`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `guard-test-parts` | een detectorklasse met een dunne test: falende voorbeelden, slagende voorbeelden, de echte boom | geef de test een dataprovider met falende voorbeelden, een test met slagende voorbeelden over een zandbak en één test over de echte boom |
| `guard-literal-path` | geen guard houdt een pad als letterlijke tekst | geef de root en de mappen mee vanuit de dunne test, of lees de tabel uit de gids |
| `guard-name` | een detector heet `<Subject>Guard` | hernoem een klasse die op `Helpers` of `Scenario` eindigt |

`PhpUnitExampleReader` leest de drie delen. Een test is een publieke methode `test...` of een methode met het attribuut `Test`; zijn body telt met de private helpers die hij aanroept. De echte boom is een test zonder dataprovider die een root bouwt uit `dirname(__DIR__, n)`, een methode `violations` of `findings` aanroept en een leeg resultaat vaststelt. Een falend voorbeeld stelt de woorden van een melding of een niet-leeg resultaat vast; een slagend voorbeeld stelt een leeg resultaat vast en is niet de echte boom.

Telling: `tests/Guards/lists/guard-shape.txt`, rij `guard-shape-list` (2 regels: een test waarvan het slagende voorbeeld in de echte boom zit, en een letterlijk pad in `ComposerNamespaces`).
Review controleert, de guard niet: of elke andere schrijfwijze van de constructie een falend voorbeeld heeft (rubric item 13).
