# Guard: TestFixtureGuard

Beslist dat een set-uphook geen testdata in properties zet voor elke test.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `fixture` | een test bouwt zijn staat zelf, in lokale variabelen of via een scenariohelper in `tests/Support` | geen toewijzing aan `$this->...` in `setUp()`, een `setUp<Trait>()` of een methode met `#[Before]` |

Telling: `tests/Guards/lists/test-fixtures.txt`, rij `test-fixtures-list` (19 regels).
