# Guard: project-files

De projectbestanden naast de code: de PHPUnit-configs en de commando's die PHPUnit draaien. De detectors hebben hun dunne test in `tests/Guards/CiProjectFilesArchitectureTest.php`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `phpunit-strict` | een test die risky is of een notice geeft, faalt | zet `failOnRisky="true"` en `failOnNotice="true"` op `<phpunit>` en geef `--fail-on-risky --fail-on-notice` mee aan de run |

`PhpUnitRunGuard` leest `phpunit.xml` en `phpunit.smoke.xml`, de scripts van `composer.json`, `scripts/checks.sh` en elke `run:` van `.github/workflows`. Een run is een regel met `phpunit`, `paratest` of `artisan test`; een regel die met `#` begint telt niet.

Geen getelde lijst: de echte boom heeft geen overtreding, en de test over de echte boom verwacht er nul.
Review controleert, de guard niet: of een run in een ander bestand (een los script, de README) de opties ook meegeeft.
