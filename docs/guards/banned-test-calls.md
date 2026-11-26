# Guard: banned-test-calls

`BannedTestCallGuard` beslist welke aanroepen een test niet doet: de config, de klok en de container krijgen elk één schrijfwijze, een test blijft binnen het proces en gaat door de echte middleware.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `config-set` | config zet je met de helper en een array | `config(['key' => $value])` |
| `clock-set` | de klok verzet je via de testcase; alleen de pure unit-tier zet de datumklasse zelf | `$this->travelTo()`, `$this->freezeTime()` |
| `wall-clock` | een test leest de klok via `now()`, nooit de klok van het systeem | `now()` en `$this->travelTo()` |
| `container-binding` | een kant-en-klaar object gaat de container in via `app()->instance()` | `app()->instance(Abstract::class, $fake)` |
| `wait` | een test wacht niet echt | de nep-Sleep van de basis-set-up, of `$this->travel()` |
| `stray-switch` | alleen de basis-set-up zet de vlaggen voor losse requests en processen aan, en niets zet ze uit | nep de requests en processen die de test verwacht |
| `network` | geen socket, geen URL-lezer, geen eigen HTTP-client | de Http-client met `Http::fake([...])` |
| `fake-all` | een nep van events, jobs of commands noemt de klassen die de test controleert | `fake([X::class])` |
| `real-path` | een request gaat door de middleware en de exception handler | log in als gebruiker met de juiste rechten en controleer de response |
| `named-status` | een status met een eigen assertie gebruikt die assertie | `assertOk()`, `assertConflict()` |
| `project-double` | geen mock van een klasse van het project | de echte klasse, of een fake in `tests/Support` via `app()->instance()` |

De guard leest functies, methoden, statische aanroepen onder elke alias en volledige naam, de facade en de fabriek. Een vlag uitzetten mag ook in de basis-set-up niet.
Telling: `tests/Guards/lists/banned-test-calls.txt`, rij `banned-test-calls-list` (34 regels).
Blinde vlek: een callable als string en een netwerkpad via een bibliotheek die zelf een bestand of socket opent.
Review checks, and the guard does not: of een fake van een andere facade de juiste klassen noemt.
