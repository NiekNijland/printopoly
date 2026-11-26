# Guard: HermeticBaseGuard

Beslist dat elke opstartende test vanuit dezelfde basis-set-up begint, in `setUp()` van `tests/TestCase.php`, na de set-up van de ouder.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `missing` | de basis-set-up roept aan: `Http::preventStrayRequests()`, `Process::preventStrayProcesses()`, `Process::fake([])`, `Sleep::fake()`, `$this->freezeTime()`, `Str::createUuidsNormally()`, `Str::createRandomStringsNormally()` | voeg de aanroep toe na `parent::setUp()` |
| `bypasses-base` | een test die de applicatie opstart breidt de basis-testcase uit | breid `Tests\TestCase` uit |

De suite `smoke` (`#[Group('smoke')]`) draait tegen een opgestarte stack en valt buiten de basis-set-up.
Telling: `tests/Guards/lists/hermetic-base.txt`, rij `hermetic-base-list` (7 ontbrekende aanroepen). Stap 4 zet ze in de basis en voegt de test van de basis-set-up toe.
