# Guard: TestClassGuard

Beslist dat een testbestand alleen zijn testklasse declareert en dat andere typen in `tests/Support` of `tests/Concerns` staan.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `extra-class` | een `*Test.php` declareert één klasse, met de naam van het bestand | een testdouble in `tests/Support`, of een anonieme klasse |
| `outside-support` | een klasse, trait, interface of enum buiten een testbestand staat in `tests/Support` of `tests/Concerns`; de basis-testcase is de uitzondering | verplaats naar `tests/Support` |

Geen lijst: de boom staat op nul.
