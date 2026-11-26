# Eén patroon per taak

Status: aanvaard.

## Context

Printopoly groeide snel, met veel parallelle sessies. Elke taak kreeg zo meerdere vormen naast elkaar. De meting van 26 november 2026 (`8133cf4`):

- 197 PHP-bestanden in `app`, verdeeld over 19 platte mappen per soort klasse; geen enkele klasse stond in een module.
- 18 controllers valideerden zelf, terwijl er 0 form requests waren. 47 controles op toegang stonden in de code, naast 3 policies en 0 routes met `can:`.
- 33 plekken gaven JSON terug zonder Data-object.
- 59 controllers waren `final class` in plaats van `final readonly`.
- 420 tests droegen het attribuut `Test`, en 23 unittests startten de applicatie op.
- 551 React-componenten waren een `function`, naast const arrows.
- 7 klassen in een pure laag noemden een model, 11 controllers schreven zelf naar de database, 4 bestanden in `lib` importeerden een component.

Mensen en agents kopiëren de code naast de code die ze wijzigen. Met meerdere vormen in beeld groeit elke vorm mee.

## Besluit

Elke taak heeft één manier, met één voorbeeldbestand. De tabel One pattern in `AGENTS.md` noemt per taak de manier, de guard en het voorbeeld; `app/AGENTS.md`, `tests/AGENTS.md` en `resources/js/AGENTS.md` geven de regels per gebied. De review volgt `docs/review-rubric.md`.

De backend volgt de layout van de kit. De frameworklaag blijft plat (controllers, middleware, requests, modellen, policies, providers). Domeincode staat in `app/Modules/<Domain>` met de vaste mappen van de kit, adapters naar een extern systeem in `app/Integrations/<System>`, code zonder domein in `app/Support`. De tabellen staan in `docs/guards/layout.md`. De frontend volgt de lagen van de kit, met één afwijking: de gedeelde laag `render` onder de features.

Drie afwijkingen van de kit zijn besluiten van Niek (D-16 in het plan): één tweede autorisatiepatroon voor geheime links (box-tokens en anonieme printjobs) met een eigen middleware; één getypte `fetch` voor de offline sync en de print-API; en een verplaatsing met opgeslagen klassenamen in één release met een lege wachtrij. Productbesluiten blijven in `docs/beslissingen.md`; dit record en de volgende in `docs/decisions` gaan over codepatronen.

Elke regel heeft een guard in de suite `Guards` (`tests/Guards`), een lintregel of een regel van de analyser. De overtredingen van vandaag staan in een getelde lijst per guard, met een ratchetrij in `scripts/ci-ratchets.sh`. Zo'n lijst wordt alleen korter; een nieuwe overtreding los je op in de code.

## Gevolgen

Stap 4 legt de tests gelijk (spelling, basis-set-up, tiers). Stap 5 verplaatst elke klasse met een verplaatskaart naar haar module, in één integratiebranch, en leegt de lijst van de layout. Stap 7 splitst te lange bestanden en methodes, stap 8 brengt form requests, autorisatie op de route, Data-objecten en de token-middleware. Elke stap maakt zijn lijsten leeg en haalt ze daarna weg.

Een verplaatste job, mail of listener draagt zijn oude naam in de wachtrij van Horizon. Die verplaatsing gaat in één release: de wachtrij is leeg voor de deploy. De collecties in MongoDB bewaren geen klassenaam.
