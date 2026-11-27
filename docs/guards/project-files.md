# Guard: project-files

De projectbestanden naast de code: de PHPUnit-configs en de commando's die PHPUnit draaien, de lokale stack en `.env.example`. `PhpUnitRunGuard` heeft zijn dunne test in `tests/Guards/CiProjectFilesArchitectureTest.php`, `LocalStackGuard` in `tests/Guards/LocalStackArchitectureTest.php` en `EnvExampleGuard` in `tests/Guards/EnvExampleArchitectureTest.php`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `phpunit-strict` | een test die risky is of een notice geeft, faalt | zet `failOnRisky="true"` en `failOnNotice="true"` op `<phpunit>` en geef `--fail-on-risky --fail-on-notice` mee aan de run |
| `local-stack` | de lokale stack draait de versies van CI | zet in `compose.yaml` het image van de CI-service, in `docker/8.5/Dockerfile` de Node van `.nvmrc`, de Chrome van CI en een exacte versie bij elke installatie buiten apt |
| `env-example` | `.env.example` noemt elke instelling die een eigen config leest | zet `<KEY>=` met de waarde voor ontwikkeling in `.env.example`, of als regel met `#` ervoor als de standaard volstaat |

`PhpUnitRunGuard` leest `phpunit.xml` en `phpunit.smoke.xml`, de scripts van `composer.json`, `scripts/checks.sh` en elke `run:` van `.github/workflows`. Een run is een regel met `phpunit`, `paratest` of `artisan test`; een regel die met `#` begint telt niet.

`LocalStackGuard` leest `compose.yaml`, de services van de workflows, `docker/8.5/Dockerfile` en `.nvmrc`. Een service in `compose.yaml` met een eigen build telt niet; elke andere draait een image met een versietag of een digest, en een service met de naam van een CI-service draait hetzelfde image. Het Dockerfile zet `NODE_VERSION` op de versie van `.nvmrc` en `CHROME_VERSION` op de versie achter `chrome-headless-shell@` in CI; de build faalt zelf als Playwright een andere Chrome meebrengt. `npm install -g`, `npx -y`, `composer global require` en `corepack prepare` noemen een exacte versie, Node komt met `=` uit apt en de installer van Composer krijgt `--version`. Pakketten van apt staan niet vast: de archieven bewaren oude versies niet.

`EnvExampleGuard` leest elke aanroep `env('<KEY>')` in `config`. Een sleutel die de config van het pakket zelf ook leest (de map `config` van het pakket in `vendor`) telt niet; een eigen config, zoals `config/printopoly.php`, telt helemaal. Een regel `<KEY>=` telt, ook achter `#`; een sleutel die alleen in een zin staat, telt niet.

Telling: rij `compose-latest-images` in `scripts/ci-ratchets.sh` telt een image op `:latest` in `compose.yaml`. Hij staat op 0.

Verder geen getelde lijst: de echte boom heeft geen overtreding, en de test over de echte boom verwacht er nul.
Review controleert, de guard niet: of een run in een ander bestand (een los script, de README) de opties ook meegeeft.
