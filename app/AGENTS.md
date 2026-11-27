# Backend

Elke taak heeft één manier, en die staat hier. Code die het anders doet, wacht op haar verplaatsing: kopieer dit bestand, niet de code ernaast. De redenen staan in `docs/decisions/0001-one-pattern.md`.

## Layout

De tabellen van de layout staan in `docs/guards/layout.md`: de wortels (modules en adapters), de frameworklaag en de mappen van een module, elk met de naam die een klasse daar draagt. `ModuleLayoutGuard` leest die tabellen; deze gids herhaalt ze niet. De guard `layout` zegt het zo: een klasse staat in een module, een adapter of een laag van de tabellen, en een klasse heeft de naam uit de kolom Naam van haar rij. Twee modules verschillen nooit alleen in een meervoud of een voorvoegsel (`OneModulePerDomainArchitectureTest`).

- De frameworklaag blijft plat, zoals in een kale Laravel-installatie: `app/Http/Controllers`, `app/Http/Middleware`, `app/Models`, `app/Policies`, `app/Providers`, en de form requests in `app/Http/Requests/<Area>`.
- Domeincode staat in één module per domein, `app/Modules/<Domain>`, in de vaste mappen van de kit. Een map groepeert hoogstens één niveau diep; niets staat in de wortel van een module.
- Een adapter naar een extern systeem staat in `app/Integrations/<System>`, met zijn contract. Een adapter kent geen klasse van een module; een module bereikt een adapter via een service.
- Code die geen domein kent, staat in `app/Support`. Review controleert of een klasse daar echt geen domein kent, de guard niet (rubric item 9).

Een command en een listener staan in hun module; `bootstrap/app.php` laat het framework ze in `app/Modules/*/Commands` en `app/Modules/*/Listeners` vinden.

### Pure lagen

Een pure laag noemt nooit een model of de databaselaag. Pure lagen zijn de mappen `Contracts`, `Enums`, `Exceptions`, `ValueObjects` en `app/Support`. Een DTO noemt een model alleen in zijn statische `from*`-fabrieken. De guard `pure-layers` leest de tabel in `docs/guards/pure-layers.md`. De map `Support` van een module mag de database wel kennen.

### Opgeslagen klassenamen

Een job, mail of listener in de wachtrij draagt zijn klassenaam in de payload van Horizon. Een verplaatsing van zo'n klasse gaat in één release: voor de deploy is de wachtrij leeg (`horizon:terminate` en een lege queue), zodat geen payload de oude naam nog draagt. Dat is de variant met één release, het besluit van Niek (D-16, Q-07); de standaard van de kit is drie releases met een alias. De collecties in MongoDB bewaren geen klassenaam. Review controleert dat, de guard niet (rubric item 4): geen guard leest een payload of een document.

## Eén manier per taak

### Klassen

- Een controller en een action zijn `final readonly`, met hun afhankelijkheden in de constructor (guard `class-shape`).
- Een action heet naar een werkwoord en een zelfstandig naamwoord, zonder `Action`-achtervoegsel (`DeleteEdition`). Een action heeft naast de constructor één publieke methode: `handle()`.
- Een enum heeft een string als waarde. Een enum-case staat in `UPPER_CASE`. Een map `Enums` bevat alleen enums.
- Een DTO heet `<X>Data`: een klasse in een map `Data`, en elke klasse die van `Spatie\LaravelData\Data` erft.
- Elke concrete klasse is `final`; een concrete klasse wordt nooit uitgebreid (guard `closed-classes`). De docblock-tag `@final` staat alleen op een concrete klasse die open blijft, met een beslisregel.
- Een trait is er voor code die meerdere klassen delen (guard `single-use-traits`). Een trait met één gebruiker gaat op in die klasse.
- Een PHP-bestand telt hoogstens 400 regels, tests meegeteld (guard `file-size`). Een methode telt hoogstens 80 regels, en een controller-actie telt hoogstens 40 regels (guard `method-size`). Splits naar gedrag, nooit naar regelaantal.
- In de applicatie staat geen debuguitvoer, geen proces dat stopt, geen uitvoer buiten de response, geen sprong en geen globale variabele, geen verwijderde database- en patroonfuncties (guard `architecture-presets`). Ook geen zwakke hashes, raadbare willekeur, tijdelijke namen, shellaanroepen, code uit een string, deserialisatie, variabelen uit een array of runtime-asserties.

### HTTP

- Een controller heet `<Area>/<Noun>/<Verb>Controller`, en een controller heet naar een werkwoord uit de tabel in `docs/guards/controller-names.md` (guard `controller-names`). Elk werkwoord in de tabel draagt minstens één controller; een nieuw werkwoord komt in de tabel met de eerste controller die het nodig heeft.
- Een controller schrijft, lockt en opent geen transactie (guard `thin-controllers`). Hij roept een action of een service van een module aan.
- Validatie staat in een form request met regels als array; de controller leest `$request->validated()` (guard `backend-patterns`: `RequestValidationGuard`, `ValidatedInputGuard`, `FormRequestGuard`).
- Autorisatie staat op de route met `can:`, de regel over een record in de policy. Een route zonder record vraagt een case van `Permission`. Een action weigert niets zelf (`ControllerAuthorizationGuard`, `HttpRefusalGuard`). De route-tests in `tests/Feature/Http` lopen elke route af: een check op de route, een rate limit, en een weigering van andermans record.
- Een geheime link in plaats van een account is het tweede patroon: de link van een box, het owner-geheim van een box en de afbeelding voor de groepsapp. De route noemt haar soort met `capability:<soort>` (een case van `BoxCapability`) en de middleware `TokenCapability` antwoordt 404 op een geheim dat niets opent, vóór de validatie. `tests/Feature/Http/Middleware/TokenCapabilityTest.php` houdt elke route met zo'n parameter eraan. Een anonieme printjob heeft haar token als routesleutel; daar beslist `PrintJobPolicy` met `can:`. Of een geheim alleen zijn eigen box opent, controleert review (rubric item 3).
- Een JSON-antwoord is een Data-object (`JsonEndpointGuard`). Een Inertia-pagina heeft een letterlijke naam met een bestand in `resources/js/pages` (`InertiaPageGuard`). Een redirect gaat via `to_route()` of `back()` (`RedirectGuard`), een flash is één vertaalde regel onder `success`, `error` of `info` (`FlashMessageGuard`).
- Een limiter staat in `AppServiceProvider`, met zijn getal uit config, en een route noemt hem als `throttle:<name>` (`RateLimiterGuard`).

### Container, modellen, fouten en wachtrijen

- Afhankelijkheden komen via de constructor. Een eigen klasse bindt zichzelf met `#[Scoped]`, `#[Singleton]` of `#[Bind]` (`ContainerBindingGuard`).
- Een model gebruikt `casts()` met onveranderlijke datums, de attributen `#[Fillable]`, `#[Table]`, `#[Connection]` en `#[Hidden]`, en `booted()` voor modelevents (`ModelConventionGuard`).
- Een brede catch meldt de fout, redt hem of gooit hem opnieuw (`EmptyCatchGuard`). Een logregel is een vaste tekst met de fout als context (`LogMessageGuard`).
- Een event gaat via `Event::dispatch(new XEvent(...))`. Een event gebruikt de trait `Dispatchable` niet: Rector maakt van `XEvent::dispatch()` de helper `event()`, en die verbiedt de analyser (`EventDispatchGuard` en de analyser).
- Een job noemt zijn queue met een case van de enum, en elke klasse in de wachtrij heeft een timeout en tries (`QueueNameGuard`, `QueuedClassLimitsGuard`). Review controleert of de timeout onder die van de worker blijft, de guard niet (rubric item 19).
- Een geplande taak heeft `withoutOverlapping(<minuten>)` (`ScheduledTaskGuard`).
- Een migratie noemt geen applicatieklasse (`MigrationClassGuard`). Een index staat in een migratie in zijn documentvorm voor MongoDB.
- Een type vernauw je met een controle die de analyser kent en die bij runtime faalt, nooit met een inline `@var` (`InlineVarCastGuard`).
- `mixed` als type staat alleen in de JSON-ingangen: `app/Support/JsonShape.php` en de parsers in `app/Modules/Editions/Support` die de rij `mixed-outside-json-entry` bij naam uitzondert. De rij `json-entry-mixed` houdt hun aantal vast (`docs/decisions/0007-mixed-per-bestand.md`).
- De verboden aanroepen staan in `phpstan.neon`, elk met een melding die de vervanger noemt. De paden onder `allowIn` en `allowExceptIn` telt de rij `analyser-allow-paths`; dat aantal mag alleen dalen. Een regel van de analyser die uit staat (`false`, `no` of `off` in `phpstan.neon` of `phpstan-tests.neon`) telt de rij `analyser-switches-off`; alleen `dynamicCallOnStaticMethod` staat uit, om de querybuilder. De tijd komt uit `now()`, config uit de getypte accessors van `Config`.

### Teksten

- Elke sleutel staat in elke taal met dezelfde `:placeholders` en evenveel vormen gescheiden door `|` (guard `translations`).
- Een sleutel in `t()`, `tChoice()`, `__()`, `trans()`, `trans_choice()` of `@lang` bestaat.
- Een sleutel staat als hele string in een bron, of past bij het vaste begin of eind van een template. Een ongebruikte sleutel gaat uit elke taal.
