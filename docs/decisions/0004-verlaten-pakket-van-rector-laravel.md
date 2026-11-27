# Een verlaten pakket onder rector-laravel

Status: aanvaard.

## Context

`composer audit` meldde in stap 9 twee verlaten pakketten. Het eerste was `rector/rector-laravel`, de oude naam van de Laravel-regels voor Rector. Die naam wijst nu naar `driftingly/rector-laravel`: dezelfde code, dezelfde versie (2.7.3) en dezelfde namespace `RectorLaravel`. `composer.json` vraagt nu dat pakket.

Het tweede is `symplify/rule-doc-generator-contracts`. Composer noemt geen vervanger. Het pakket bevat alleen de interfaces waarmee een Rector-regel zijn documentatie beschrijft, en `driftingly/rector-laravel` vraagt het in zijn `require`. Er draait niets van in de applicatie; het is een dev-pakket onder een tool die de kit voorschrijft (de Laravel-sets van Rector, rij `refactor-sets`).

## Besluit

- `driftingly/rector-laravel` vervangt `rector/rector-laravel`.
- `symplify/rule-doc-generator-contracts` blijft tot `driftingly/rector-laravel` het pakket niet meer vraagt. De kit regelt dit geval in `tools/README.md` (`OVERRIDE_AT_ZERO`): de cap `dependencies-abandoned` gaat van 0 naar 1, `cap-dependencies-abandoned` staat in `OVERRIDE_AT_ZERO` van `scripts/ci-ratchets.sh` en in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`.

## Gevolgen

De dashboardrij `dependencies-abandoned` staat op 1 en mag alleen dalen. Zodra een release van `driftingly/rector-laravel` het pakket laat vallen, gaat de cap terug naar 0 en verdwijnt de rij uit `SHRINK_ONLY` en `OVERRIDE_AT_ZERO`. Een tweede verlaten pakket valt niet onder dit besluit: dat wordt vervangen, of krijgt een eigen record.
