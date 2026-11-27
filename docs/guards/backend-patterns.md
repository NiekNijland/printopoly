# Guard: backend-patterns

Elke regel hieronder heeft een bewaker in de suite `Guards` (`tests/Guards`) of een verboden aanroep van de analyser. Geen regel heeft nog een getelde lijst: de boom staat overal op nul. Een nieuwe afwijking los je op in de code.

## Verboden aanroepen

| Regel | Waar | Lijst |
| --- | --- | --- |
| geen `sleep`, `time()`, `is_null`, sessiehelper, observers, strengheidsaanroepen buiten `AppServiceProvider`, automatisch eager loaden, `forceScheme`, cache-locks, directe HTTP-client- of foutmelderaanroepen, handmatige listeners, processen en bestandswerk in acties en controllers | `phpstan.neon` | geen |
| config lezen met `Config::string()` en verwanten, geen container met de hand, events via `Event::dispatch(new XEvent(...))`, vertalen met `__()`, de tijd met `now()`, geen `Carbon`, `lazyById()`/`chunkById()`, routes alleen in `routes/` | `phpstan.neon` | geen |

## HTTP

| Regel | Bewaker | Lijst |
| --- | --- | --- |
| validatie in een form request | `RequestValidationGuard` | geen |
| invoer via `$request->validated()` | `ValidatedInputGuard` | geen |
| geen weigering in een actie (`abort*`, `Gate::`, `authorize()`, `can()`); geen HTTP-weigering buiten `app/Http` | `ControllerAuthorizationGuard`, `HttpRefusalGuard` | geen |
| JSON-antwoord is een Data-object | `JsonEndpointGuard` | geen |
| Inertia-pagina bij letterlijke naam met een bestand in `resources/js/pages` | `InertiaPageGuard` | geen |
| redirect met `to_route()` of `back()` | `RedirectGuard` | geen |
| flash: één vertaalde regel onder `success`, `error` of `info` | `FlashMessageGuard` | geen |
| routeparameter in camelCase, geen closure als route | `RouteParameterGuard` | geen |
| limiter in `AppServiceProvider`, getal uit config, `throttle:<naam>` | `RateLimiterGuard` | geen |
| form request: regels als array, geen `authorize()` die alleen `true` geeft | `FormRequestGuard` | geen |

## Routelijst (feature-tests, booten de app)

| Regel | Test | Lijst |
| --- | --- | --- |
| elke route achter `auth` heeft `can:` | `tests/Feature/Http/RoutePermissionCoverageTest.php` | geen |
| elke route heeft één `throttle:<naam>` van een geregistreerde limiter | `tests/Feature/Http/RouteRateLimitCoverageTest.php` | geen |
| elke route met een record weigert andermans record (403/404) | `tests/Feature/Http/ObjectLevelAccessCoverageTest.php` | geen |
| elke route met een geheime link draagt `capability:<soort>` en weigert een geheim dat niets opent (404) | `tests/Feature/Http/Middleware/TokenCapabilityTest.php` | geen |

## Container, modellen, fouten, wachtrijen, types

| Regel | Bewaker | Lijst |
| --- | --- | --- |
| een eigen klasse bindt zichzelf met een attribuut | `ContainerBindingGuard` | geen |
| model: `casts()`, onveranderlijke datums, `#[Fillable]`, `#[Table]`, `#[Connection]`, `#[Hidden]`, `booted()`, nooit unguarded | `ModelConventionGuard` | geen |
| brede catch meldt, redt of gooit opnieuw | `EmptyCatchGuard` | geen |
| logregel vast, de fout als context | `LogMessageGuard` | geen |
| een event zonder de trait `Dispatchable`, geen dispatcher met de hand | `EventDispatchGuard` | geen |
| wachtrij via de enum | `QueueNameGuard` | geen |
| wachtrijklasse met timeout en tries, unieke job met eigen sleutel | `QueuedClassLimitsGuard`, `UniqueJobGuard` | geen |
| geplande taak met `withoutOverlapping(<minuten>)` | `ScheduledTaskGuard` | geen |
| migratie noemt geen applicatieklasse | `MigrationClassGuard` | geen |
| geen inline `@var` | `InlineVarCastGuard` | geen |

Blinde vlekken: een waarde of sleutel die eerst in een variabele staat, een ongetypeerde ontvanger, een parameter die het patroon van de route weigert (de router antwoordt dan 404 vóór de controle).
