# Printopoly voor agents

Printopoly is een gratis openbare website in het Nederlands en het Engels. Je ontwerpt er een eigen editie van het bekende handelsspel en downloadt die als print-set: PDF's met instructies, een bordsticker, kaarten, eigendomsbewijzen en speelgeld. Het is een hobbyproject van Niek.

Lees `docs/voortgang.md` voor de stand van zaken, dan `docs/plan.md` en `docs/beslissingen.md`. Afgeronde rondes staan in `docs/archive`.

## Welke bron wint

1. De code en haar tests.
2. `docs/beslissingen.md`: de productbesluiten (B1, B2, ...). De lijst groeit alleen; een nieuwe rij zegt welke rij ze vervangt.
3. `docs/decisions`: de besluiten over codepatronen, één record per gebied (`docs/decisions/0001-one-pattern.md`).
4. Deze gidsen en de rijen in `docs/guards`.

Controleer of een route, pagina of actie bestaat voordat een plan erop bouwt.

## Huisregels

Product

- Printopoly ziet er levendig uit, als een speltafel. Een pagina is nooit kaal, en een nieuwe functie krijgt een plek in het ontwerp in plaats van een losse knop. Review controleert dat, de guard niet (rubric item 16).
- Controls komen uit shadcn/ui (`resources/js/components/ui`), in de huisstijl. Review controleert dat, de guard niet (rubric item 16).
- De interface is tweetalig; elke tekst staat in `lang/nl.json` en `lang/en.json`. De guard `translations` faalt op een sleutel die in één taal ontbreekt.
- Plannen en gidsen zijn Nederlands; code, regelnamen en technische namen Engels. Teksten voor gebruikers en in de docs gaan door de humanizer-skill.

Werkwijze

- Alles draait in Sail (`./vendor/bin/sail ...`). `bash scripts/checks.sh` draait wat de stap `checks` van CI draait; de README noemt de losse commando's.
- Een commit begint met `NOTICKET <type>: onderwerp`, met het type uit `scripts/ci-commit-messages.sh`. Dat script faalt op een commit zonder ticket of type.
- Geen commentaar in code, behalve wat een lezer later anders laat handelen. De ratchetrij `comments` in `scripts/ci-ratchets.sh` faalt op een nieuw commentaar zonder `[ratchet: comments] <reden>` in de commit.
- `bash scripts/debt-dashboard.sh --offline` draait in CI en faalt zodra een teller boven zijn plafond in `scripts/debt-caps.json` komt.

## Guards

Elke regel van de gidsen noemt zijn guard bij een naam van deze lijst. Elke guard houdt de woorden die hij leest in zijn eigen bestand in `docs/guards`. `GuideRulesArchitectureTest` faalt op een gids die de woorden van een rij kwijt is.

| Guard | Rijen | Beslist |
| --- | --- | --- |
| `architecture-presets` | `docs/guards/architecture-presets.md` | wat de presets `php` en `security` van de kit verbieden in de applicatie |
| `assertion-spelling` | `docs/guards/assertion-spelling.md` | hoe een test iets vaststelt |
| `backend-patterns` | `docs/guards/backend-patterns.md` | de verboden aanroepen en de patronen voor HTTP, container, modellen, fouten en wachtrijen |
| `banned-test-calls` | `docs/guards/banned-test-calls.md` | welke aanroepen een test niet doet |
| `class-shape` | `docs/guards/class-shape.md` | de vorm van een klasse naar haar map |
| `closed-classes` | `docs/guards/closed-classes.md` | dat een concrete klasse dicht is |
| `controller-names` | `docs/guards/controller-names.md` | de naam van een controller en de werkwoordentabel |
| `file-size` | `docs/guards/file-size.md` | de lengte van een PHP-bestand |
| `frontend` | `docs/guards/frontend.md` | de lintregels en lagen van de frontend |
| `guard-shape` | `docs/guards/guard-shape.md` | de vorm van een guard en zijn test |
| `guides` | `docs/guards/guides.md` | de paden, tabellen en woorden van de gidsen |
| `hermetic-base` | `docs/guards/hermetic-base.md` | de basis-set-up van een opstartende test |
| `layout` | `docs/guards/layout.md` | waar een klasse staat en hoe ze heet |
| `method-size` | `docs/guards/method-size.md` | de lengte van een methode en een controller-actie |
| `pure-layers` | `docs/guards/pure-layers.md` | welke lagen nooit een model of de database noemen |
| `single-use-traits` | `docs/guards/single-use-traits.md` | dat een trait meerdere gebruikers heeft |
| `test-classes` | `docs/guards/test-classes.md` | welke typen een testbestand declareert |
| `test-declarations` | `docs/guards/test-declarations.md` | hoe een test in PHPUnit gedeclareerd wordt |
| `test-fixtures` | `docs/guards/test-fixtures.md` | dat een set-uphook geen testdata klaarzet |
| `test-helpers` | `docs/guards/test-helpers.md` | waar een testhelper staat |
| `test-locations` | `docs/guards/test-locations.md` | waar een test staat |
| `test-reflection` | `docs/guards/test-reflection.md` | dat een test niet via reflectie leest |
| `test-tiers` | `docs/guards/test-tiers.md` | dat een unittest de applicatie niet opstart |
| `thin-controllers` | `docs/guards/thin-controllers.md` | dat een controller niet zelf schrijft |
| `translations` | `docs/guards/translations.md` | dat elke sleutel in elke taal bestaat en gebruikt wordt |

## One pattern

Elke taak heeft één manier. Nieuwe code kopieert het voorbeeldbestand, niet het bestand ernaast. Review gebruikt `docs/review-rubric.md`. `bash scripts/checks.sh` draait wat de stap `checks` van CI draait.

Een voorbeeld dat vandaag op een getelde lijst staat, staat ook op `tests/Guards/lists/one-pattern.txt`, net als een rij zonder guard. Die lijst wordt alleen korter. Een rij zonder voorbeeld noemt de PR van stap 8 die het voorbeeld brengt.

| Taak | De ene manier | Guard | Kopieer |
| --- | --- | --- | --- |
| Plek van een klasse | de tabellen van `docs/guards/layout.md`; domeincode in `app/Modules/<Domain>`, adapters in `app/Integrations/<System>`, de frameworklaag plat | `layout` | `app/Policies/EditionPolicy.php` |
| Controller | één actie in `app/Http/Controllers/<Area>/<Noun>/<Verb>Controller.php`, `final readonly`, roept een action of service aan | `controller-names`, `thin-controllers`, `method-size`, `class-shape` | `app/Http/Controllers/Editions/Edition/DeleteController.php` |
| Action | `final readonly`, werkwoord en zelfstandig naamwoord, één publieke `handle()` | `class-shape` | `app/Modules/Editions/Actions/DeleteEdition.php` |
| Enum | een string als waarde, cases in `UPPER_CASE`, in een map `Enums` | `class-shape` | `app/Modules/Print/Enums/PrintSet.php` |
| DTO voor de frontend | `<X>Data` in een map `Data`; een model alleen in de statische `from*`-fabrieken | `class-shape`, `pure-layers` | `app/Modules/Print/Data/PrintJobData.php` |
| Pure laag | contracts, enums, exceptions, value objects en `app/Support` kennen geen model en geen database | `pure-layers` | `app/Modules/Print/ValueObjects/ExpectedPdf.php` |
| Dichte klasse | elke concrete klasse is `final` en wordt nooit uitgebreid | `closed-classes` | `app/Policies/AssetPolicy.php` |
| Lengte van een bestand | hoogstens 400 regels per PHP-bestand; splits naar gedrag | `file-size` | `app/Models/Edition.php` |
| Lengte van een methode | hoogstens 80 regels, een controller-actie hoogstens 40 | `method-size` | `app/Models/PrintFile.php` |
| Trait | alleen voor code die meerdere klassen delen | `single-use-traits` | `tests/Concerns/RefreshesMongoDatabase.php` |
| Vertaalde tekst | een sleutel in elke taal, door de code gelezen | `translations` | `lang/nl.json` |
| Verboden aanroep | een regel van de analyser met een melding die de vervanger noemt | `backend-patterns` | `phpstan-banned-calls.neon` |
| Validatie | een form request met regels als array, gelezen met `$request->validated()` | `backend-patterns` | lands with stap 8, PR form requests |
| Autorisatie | `can:` op de route, de regel over een record in de policy | `backend-patterns` | `app/Policies/EditionPolicy.php` |
| Token-capability | een box-token of een anonieme printjob wordt gecontroleerd door één middleware | | lands with stap 8, PR token capability |
| JSON-antwoord | een Data-object, met zijn status als het geen GET is | `backend-patterns` | lands with stap 8, PR DTO's |
| Inertia-pagina | `Inertia::render()` met een letterlijke naam die een bestand in `resources/js/pages` heeft | `backend-patterns` | `app/Http/Controllers/Print/PrintStart/ShowController.php` |
| Redirect en flash | `to_route()` of `back()`; een flash is één vertaalde regel onder `success`, `error` of `info` | `backend-patterns` | `app/Http/Controllers/Auth/GoogleCallback/HandleController.php` |
| Route | één controller per route, een parameter in camelCase, één `throttle:<name>` | `backend-patterns`, `controller-names` | `routes/web.php` |
| Rate limit | een limiter in `AppServiceProvider` met zijn getal uit config | `backend-patterns` | `app/Providers/AppServiceProvider.php` |
| Container | constructorinjectie; een eigen klasse bindt zichzelf met een attribuut | `backend-patterns` | `app/Providers/TypeScriptTransformerServiceProvider.php` |
| Model | `casts()`, onveranderlijke datums, de attributen van het model, `booted()` | `backend-patterns` | `app/Models/Edition.php` |
| Fout afvangen en loggen | een brede catch meldt, redt of gooit opnieuw; een logregel is vast met de fout als context | `backend-patterns` | `app/Http/Middleware/TrackActivity.php` |
| Event | `XEvent::dispatch(...)` | `backend-patterns` | `app/Modules/Editions/Events/EditionDeletedEvent.php` |
| Wachtrij | de queue via de enum, een timeout en tries op elke klasse | `backend-patterns` | `app/Modules/Boxes/Jobs/RenderShareImageJob.php` |
| Geplande taak | een command met `withoutOverlapping(<minuten>)` in `routes/console.php` | `backend-patterns` | `routes/console.php` |
| Migratie en index | geen applicatieklasse in een migratie; een index in zijn documentvorm | `backend-patterns` | `database/migrations/2026_11_22_120000_create_feature_counts_index.php` |
| Type vernauwen | een controle die de analyser kent en die bij runtime faalt; geen inline `@var` | `backend-patterns` | `app/Modules/Content/Support/LocalizedUrls.php` |
| Testtier | de laagste eerlijke tier; een unittest start de applicatie niet op | `test-tiers` | `tests/Unit/Support/CountedListTest.php` |
| Plek van een test | het pad spiegelt de map van de klasse die de test dekt | `test-locations` | `tests/Unit/Support/CountedListTest.php` |
| Testdeclaratie | een methode `test_<zin>` met `: void` | `test-declarations` | `tests/Feature/Http/RoutePermissionCoverageTest.php` |
| Assertie | `self::assertSame(...)` en de exacte asserties van PHPUnit | `assertion-spelling` | `tests/Feature/Http/RouteRateLimitCoverageTest.php` |
| Verboden testaanroep | één schrijfwijze voor config, klok en container; geen netwerk | `banned-test-calls` | `tests/Feature/Http/ObjectLevelAccessCoverageTest.php` |
| Basis-set-up | elke opstartende test breidt `Tests\TestCase` uit | `hermetic-base` | `tests/TestCase.php` |
| Testhelper | een `public static` methode van een `final class` in `tests/Support` | `test-helpers` | `tests/Support/SourceSandbox.php` |
| Testdata | een test bouwt zijn eigen staat | `test-fixtures` | `tests/Unit/Support/CountedListTest.php` |
| Reflectie in een test | alleen het publieke gedrag | `test-reflection` | `tests/Unit/Support/CountedListTest.php` |
| Typen in de testmap | één klasse per testbestand, andere typen in `tests/Support` | `test-classes` | `tests/Support/TestPdf.php` |
| Preset van de applicatie | geen debuguitvoer, geen zwakke hash, geen shellaanroep | `architecture-presets` | `app/Modules/Content/Support/LocalizedUrls.php` |
| Frontendlaag | een bestand importeert uit zijn eigen laag en de lagen eronder | `frontend` | `resources/js/lib/i18n.ts` |
| Component en hook | een const arrow met getypte props | `frontend` | `resources/js/components/logo.tsx` |
| Bestandsnaam (frontend) | kebab-case, geen `index`-barrel | `frontend` | `resources/js/hooks/use-media-query.ts` |
| Browser-API | via de ene deur per API | `frontend` | `resources/js/hooks/use-media-query.ts` |
| Verzoek naar de server | de HTTP-hook van Inertia; de getypte `fetch` alleen in de twee deuren | `frontend` | `resources/js/lib/render/print-api.ts` |
| Navigatie en melding | `router.visit`, de ene downloadhelper, een flash van de server | `frontend` | `resources/js/components/language-switch.tsx` |
| Frontendtest | een test naast zijn bestand, met de gedeelde fakes uit de test set-up | `frontend` | `resources/js/components/logo.test.tsx` |
| Gids | een pad in backticks bestaat, elke regel noemt zijn guard | `guides` | `docs/guards/layout.md` |
| Guard | een detectorklasse met een dunne test: falende voorbeelden, slagende voorbeelden, de echte boom | `guard-shape` | `tests/Guards/FileSizeArchitectureTest.php` |

- Een guard (architectuurregel, lijst, baseline, suppressie) wordt alleen strenger. Voeg nooit een regel toe om een build groen te krijgen: los de code op, of vraag het Niek.
- Een PR die een patroon samenbrengt, voegt de guard toe die het vasthoudt, en een rij hier.

## Scoped guidance

Specifiekere `AGENTS.md`-bestanden in `app`, `tests` en `resources/js` geven de regels van die gebieden.
