# Guard: test-tiers

`TestTierGuard` beslist dat een test in `tests/Unit` de applicatie niet opstart.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `boots` | een unittest breidt `PHPUnit\Framework\TestCase` uit en gebruikt geen opstartende trait | bouw de klasse zelf op, of verplaats de test naar `tests/Feature` |

Opstartend is de testcase van het framework, de databasetraits van het framework, en elk type in `tests` dat daar via afleiding of trait bij uitkomt. Een trait met een eigen set-uphook (`setUp<Trait>`) start ook op: alleen de testcase van het framework roept die aan.
Telling: `tests/Guards/lists/test-tiers.txt`, rij `test-tiers-list` (19 testbestanden op `Tests\TestCase`).
