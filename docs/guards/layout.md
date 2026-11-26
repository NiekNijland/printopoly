# Guard: layout

Elke PHP-klasse in `app` staat op de plek die de tabellen hieronder geven, met de naam die de rij vraagt. `ModuleLayoutGuard` leest de tabellen, `OneModulePerDomainArchitectureTest` de lijst van modules.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| layout-place | een klasse staat in een module, een adapter of een laag van de tabellen | verplaats de klasse naar de rij die haar taak beschrijft |
| layout-name | een klasse heeft de naam uit de kolom Naam van haar rij | hernoem de klasse naar het patroon van de rij |
| one-module-per-domain | twee modules verschillen nooit alleen in een meervoud of een voorvoegsel | voeg de ene module in de andere, of geef haar de naam van een ander domein |

Domeincode staat in één module per domein. Een adapter naar een extern systeem staat in een eigen map naast de modules.

| Wortel | Bevat | Leden |
| --- | --- | --- |
| `app/Modules/<Domain>` | domeincode, één module per domein | `Editions`, `Print`, `Boxes`, `Photos`, `Accounts`, `Content`, `Analytics` |
| `app/Integrations/<System>` | adapters naar een extern systeem, met hun contract | `Chrome`, `Poppler`, `Ssr`, `Google` |

De frameworklaag blijft plat, zoals in een kale Laravel-installatie. `<Area>` is een routegroep, `<Noun>` waar de controller op werkt.

| Laag | Bevat | Naam |
| --- | --- | --- |
| `app/Http/Controllers` | de abstracte basis-controller | precies `Controller` |
| `app/Http/Controllers/<Area>/<Noun>` | controllers met één actie | `<Verb>Controller` |
| `app/Http/Middleware` | middleware | zelfstandig naamwoord |
| `app/Http/Requests/<Area>` | form requests | `<X>Request` |
| `app/Models` | modellen | zelfstandig naamwoord |
| `app/Policies` | policies | `<X>Policy` |
| `app/Providers` | service providers | `<X>ServiceProvider` |
| `app/Support` | code die geen domein kent | zelfstandig naamwoord |

Een module gebruikt alleen deze mappen. Een map mag bestanden per subdomein groeperen (`Actions/<Subdomain>/<Verb><Noun>.php`), één niveau diep. Niets staat in de wortel van een module.

| Map | Bevat | Naam |
| --- | --- | --- |
| `Actions` | één wijziging van toestand: `final readonly`, afhankelijkheden in de constructor, één publieke `handle()` | werkwoord en zelfstandig naamwoord, nooit een `Action`-achtervoegsel |
| `Services` | reads die meerdere aanroepers delen, en clients van een extern systeem | `<X>Service`, `<X>Client` |
| `Data` | DTO's: wat naar de frontend gaat, en request- en response-vormen | `<X>Data` |
| `ValueObjects` | elke andere domeinwaarde, `final readonly` | zelfstandig naamwoord |
| `Support` | domeinhelpers die geen Action of Service zijn: parsers, trackers, statische helpers, traits en scopes van de modellen van de module | zelfstandig naamwoord |
| `Enums` | enums met een string als waarde en cases in `UPPER_CASE` | zelfstandig naamwoord |
| `Events`, `Listeners` | events en de listeners die ze afhandelen | `<X>Event`; een listener zegt wat hij doet |
| `Jobs` | werk in de wachtrij | `<X>Job` |
| `Commands` | console commands | `<X>Command` |
| `Mail`, `Notifications` | mailables en notificaties | `<X>Mail`, `<X>Notification` |
| `Exceptions` | exceptions | `<X>Exception` |
| `Contracts` | interfaces | zelfstandig naamwoord |
| `Facades` | facades over een service van de module | zelfstandig naamwoord |

De klassen die nog niet op hun plek staan, staan in `lists/layout.txt` (sleutel: regel en pad), en de overlap `Editions`/`Edition` in `lists/module-overlap.txt`. Beide lijsten worden alleen korter; de ratchet-rijen `layout-list` en `module-overlap-list` tellen hun regels.

Review controleert, de guard niet: of een klasse in `app/Support` echt geen domein kent, en of een klasse in de map staat die haar taak beschrijft (rubric item 9).
