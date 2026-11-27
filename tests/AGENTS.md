# Tests

Elke taak heeft één manier, en die staat hier. Kopieer het voorbeeld uit de tabel One pattern van de root-`AGENTS.md`, niet de test ernaast. PHPUnit is het framework; er is geen tweede.

## Tiers

| Tier | Set-up die hij mag gebruiken | Staat in |
| --- | --- | --- |
| Unit | `PHPUnit\Framework\TestCase`; de test bouwt zijn klasse zelf op | `tests/Unit` |
| Feature | `Tests\TestCase`: de applicatie, MongoDB via `RefreshesMongoDatabase`, de basis-set-up | `tests/Feature` |
| Guards | `PHPUnit\Framework\TestCase` en een zandbak van `tests/Support/SourceSandbox.php`; geen database | `tests/Guards` |
| Smoke | een opgestarte stack met productie-drivers en echte Chrome, de groep `smoke` | `tests/Smoke` |

Een unittest breidt `PHPUnit\Framework\TestCase` uit en gebruikt geen opstartende trait (guard `test-tiers`). Kies de laagste tier die eerlijk is; review controleert dat, de guard niet (rubric item 11).

## Eén manier per taak

### Plek en vorm

- De test van een klasse staat in de map die de klasse spiegelt (guard `test-locations`). Een flowtest staat in een map die `app` ook heeft, of in de root van de tier. `tests/Guards` en `tests/Smoke` spiegelen niets.
- Een `*Test.php` declareert één klasse, met de naam van het bestand (guard `test-classes`). Een klasse, trait, interface of enum buiten een testbestand staat in `tests/Support` of `tests/Concerns`; de basis-testcase is de uitzondering.
- Een test is een methode `test_<zin>`, zonder het attribuut `Test` (guard `test-declarations`). De naam na `test_` is een zin in snake case, de casing van de formatter. Elke testmethode declareert `: void`. Geen annotatie `@test`.
- Een dataprovider staat in het attribuut `DataProvider` met een statische provider. Geen annotatie `@group`; de guardtests zijn de suite `Guards` van `phpunit.xml`.

### Opbouw

- Elke opstartende test begint vanuit dezelfde basis-set-up in `tests/TestCase.php` (guard `hermetic-base`). De basis-set-up roept aan: `Http::preventStrayRequests()`, `Process::preventStrayProcesses()`, `Process::fake([])`, `Sleep::fake()`, `$this->freezeTime()`, `Str::createUuidsNormally()`, `Str::createRandomStringsNormally()`. Een test die de applicatie opstart breidt de basis-testcase uit.
- Een test bouwt zijn staat zelf, in lokale variabelen of via een scenariohelper in `tests/Support` (guard `test-fixtures`). Een set-uphook zet geen testdata in properties.
- Geen functie in de testmap (guard `test-helpers`). Een helper is een `public static` methode van een `final class` in `tests/Support`. Een testtrait heeft alleen zijn set-up- en tear-downhook. Een gedeelde basis-testcase heeft alleen de hooks die hij overschrijft (met `#[Override]`).
- Een test leest alleen de publieke structuur van een klasse (guard `test-reflection`).

### Config, klok, container en de buitenwereld

De guard `banned-test-calls` houdt deze regels vast.

- Config zet je met de helper en een array: `config(['key' => $value])`.
- De klok verzet je via de testcase: `$this->travelTo()` en `$this->freezeTime()`. Alleen de pure unit-tier zet de datumklasse zelf. Een test leest de klok via `now()`, nooit de klok van het systeem.
- Een kant-en-klaar object gaat de container in via `app()->instance()`.
- Een test wacht niet echt; de nep-Sleep van de basis-set-up of `$this->travel()` doet dat.
- Alleen de basis-set-up zet de vlaggen voor losse requests en processen aan, en niets zet ze uit. Een test die een echt programma nodig heeft, noemt het: `RealBinary::allow('pdfinfo')` uit `tests/Support/RealBinary.php`.
- Geen socket, geen URL-lezer, geen eigen HTTP-client: de Http-client met een nep die de requests noemt.
- Een nep van events, jobs of commands noemt de klassen die de test controleert.
- Een request gaat door de middleware en de exception handler. Een status met een eigen assertie gebruikt die assertie (`assertOk()`).
- Geen mock van een klasse van het project: de echte klasse, of een fake in `tests/Support` (`tests/Support/FakePdfRenderer.php`).

### Asserties

De guard `assertion-spelling` houdt deze regels vast.

- Een assertie van PHPUnit staat achter `self::`, niet achter `static::`. Een assertie die het framework aan de testcase toevoegt (`assertDatabaseHas`) blijft op `$this`.
- Geen losse vergelijking: `assertSame` of de exacte assertie.
- Geen assertie die altijd slaagt en geen marker voor een test zonder asserties. Review controleert of een assertie kan falen, de guard niet (rubric item 11).

### Guards

- Een guard is een detectorklasse in `tests/Support/Architecture` met een dunne test in `tests/Guards` (guard `guard-shape`). Een detector heet `<Subject>Guard`. Geen guard houdt een pad als letterlijke tekst: de dunne test geeft de root en de mappen mee, en een tabel komt uit de gids.
- De dunne test heeft falende voorbeelden in een dataprovider, met de woorden van de melding; slagende voorbeelden over een zandbak, met de bijna-treffers; en één test over de echte boom. Een getelde lijst van vandaag gaat door `tests/Support/Architecture/CountedList.php`.

### Dekking

- De vloer van de backend is 97 in `scripts/coverage-floor.txt`; de `min`-rij `coverage-floor` van `scripts/ci-ratchets.sh` houdt hem vast. Het doel van de kit is 95.
- De vloer van de frontend staat in `vitest.config.ts`: 95 voor alle regels (rij `frontend-coverage-floor`) en 95 voor de `.ts`-bestanden in `resources/js` (rij `frontend-logic-coverage-floor`).
- De mutatiescore is 93 in `scripts/mutation-floor.txt`; de rij `mutation-floor` houdt hem vast. De volledige mutatierun draait elke zondag.

Geen guard heeft nog een getelde lijst met overtredingen: elke guard houdt de boom op nul. Een nieuwe overtreding los je op in de code.
