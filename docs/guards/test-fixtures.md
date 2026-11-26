# Guard: test-fixtures

`TestFixtureGuard` beslist dat een set-uphook geen testdata in properties zet voor elke test.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `fixture` | een test bouwt zijn staat zelf, in lokale variabelen of via een scenariohelper in `tests/Support` | geen toewijzing aan `$this->...` in `setUp()`, een `setUp<Trait>()` of een methode met `#[Before]` |

Geen getelde lijst: de echte boom heeft geen overtreding, en de test over de echte boom verwacht er nul.
