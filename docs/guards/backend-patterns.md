# Bewakers: backendpatronen

Elke regel hieronder heeft een bewaker in de suite `Guards` (`tests/Guards`) of een verboden aanroep van de analyser. Wat vandaag nog afwijkt staat in een getelde lijst die alleen kleiner wordt: `tests/Support/Architecture/lists/<naam>.txt` (ratchetrij `list-<naam>`) of `baselines/phpstan-banned-calls.txt` (ratchetrij `type-baseline`). Een opgeloste regel haal je uit de lijst; een nieuwe regel komt er nooit bij.

## Verboden aanroepen

| Regel | Waar | Lijst |
| --- | --- | --- |
| geen `sleep`, `time()`, `is_null`, sessiehelper, observers, strengheidsaanroepen buiten `AppServiceProvider`, automatisch eager loaden, `forceScheme`, cache-locks, directe HTTP-client- of foutmelderaanroepen, handmatige listeners, processen en bestandswerk in acties en controllers | `phpstan.neon` | geen |
| config lezen met `Config::string()` en verwanten, geen container met de hand, events via `XEvent::dispatch()`, vertalen met `__()`, de tijd met `now()`, geen `Carbon`, `lazyById()`/`chunkById()`, routes alleen in `routes/` | `phpstan-banned-calls.neon` | `baselines/phpstan-banned-calls.txt` |

## HTTP

| Regel | Bewaker | Lijst |
| --- | --- | --- |
| validatie in een form request | `RequestValidationGuard` | `inline-validation` |
| invoer via `$request->validated()` | `ValidatedInputGuard` | `raw-request-input` |
| geen weigering in een actie (`abort*`, `Gate::`, `authorize()`, `can()`); geen HTTP-weigering buiten `app/Http` | `ControllerAuthorizationGuard`, `HttpRefusalGuard` | `controller-authorization` |
| JSON-antwoord is een Data-object | `JsonEndpointGuard` | `json-endpoints` |
| Inertia-pagina bij letterlijke naam met een bestand in `resources/js/pages` | `InertiaPageGuard` | `inertia-page-names` |
| redirect met `to_route()` of `back()` | `RedirectGuard` | geen |
| flash: één vertaalde regel onder `success`, `error` of `info` | `FlashMessageGuard` | `flash-messages` |
| routeparameter in camelCase, geen closure als route | `RouteParameterGuard` | `route-declarations` |
| limiter in `AppServiceProvider`, getal uit config, `throttle:<naam>` | `RateLimiterGuard` | `rate-limits` |
| form request: regels als array, geen `authorize()` die alleen `true` geeft | `FormRequestGuard` | geen |

## Routelijst (feature-tests, booten de app)

| Regel | Test | Lijst |
| --- | --- | --- |
| elke route achter `auth` heeft `can:` | `tests/Feature/Http/RoutePermissionCoverageTest.php` | `route-permissions` |
| elke route heeft één `throttle:<naam>` van een geregistreerde limiter | `tests/Feature/Http/RouteRateLimitCoverageTest.php` | `route-rate-limits` |
| elke route met een record weigert andermans record (403/404) | `tests/Feature/Http/ObjectLevelAccessCoverageTest.php` | `object-level-access` |

## Container, modellen, fouten, wachtrijen, types

| Regel | Bewaker | Lijst |
| --- | --- | --- |
| een eigen klasse bindt zichzelf met een attribuut | `ContainerBindingGuard` | `provider-bindings` |
| model: `casts()`, onveranderlijke datums, `#[Fillable]`, `#[Table]`, `#[Connection]`, `#[Hidden]`, `booted()`, nooit unguarded | `ModelConventionGuard` | geen |
| brede catch meldt, redt of gooit opnieuw | `EmptyCatchGuard` | `swallowed-catches` |
| logregel vast, de fout als context | `LogMessageGuard` | geen |
| geen `Event::dispatch(new X)` | `EventDispatchGuard` | geen |
| wachtrij via de enum | `QueueNameGuard` | `queue-names` |
| wachtrijklasse met timeout en tries, unieke job met eigen sleutel | `QueuedClassLimitsGuard`, `UniqueJobGuard` | geen |
| geplande taak met `withoutOverlapping(<minuten>)` | `ScheduledTaskGuard` | `scheduled-task-locks` |
| migratie noemt geen applicatieklasse | `MigrationClassGuard` | `migration-classes` |
| geen inline `@var` | `InlineVarCastGuard` | `inline-var-casts` |

Blinde vlekken: een waarde of sleutel die eerst in een variabele staat, een ongetypeerde ontvanger, een parameter die het patroon van de route weigert (de router antwoordt dan 404 vóór de controle).
