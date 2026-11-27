# Guard: queries

Hoeveel documenten een query leest, en of een limiet per groep standhoudt als twee verzoeken tegelijk toevoegen. `QueryLoadGuard` heeft zijn dunne test in `tests/Guards/QueryLoadArchitectureTest.php`, `QuotaCountGuard` in `tests/Guards/QuotaCountArchitectureTest.php`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `query-streams` | een opruimklasse leest haar documenten per pagina | gebruik `chunkById()` waar de documenten verwijderd worden, `lazyById()` om te lezen, of begrens de query met `limit()` |
| `query-per-pass` | geen query per doorgang van een lus over documenten | lees wat elke doorgang nodig heeft in één query vóór de lus en zoek het in de lus op bij zijn sleutel |
| `quota-slot` | een limiet per groep neemt een plek met `QuotaSlots` | claim een plek met `QuotaSlots` en een unieke index op de groep en het plekveld, in plaats van eerst te tellen en daarna in te voegen |

`QueryLoadGuard` leest `app`. In een opruimklasse (een klasse in een map `Support` waarvan de naam op `Cleanup` eindigt) is een `get()`, `pluck()` of `all()` op een keten die bij `<Class>::query()` begint een overtreding, tenzij de keten `limit()`, `take()`, `forPage()` of `first()` heeft; een statische `<Class>::all()` ook. In elke klasse is een lus `foreach` over het resultaat van een query (de query zelf, of een variabele die in dezelfde methode een query krijgt) een overtreding als zijn body een leesquery doet: een `get()`, `first()`, `count()`, `pluck()`, `exists()`, `lazyById()`, `chunkById()` of een andere lezing op een keten vanaf `<Class>::query()`. De guard volgt daarbij de methodes van dezelfde klasse die de lus op `$this` aanroept. Een schrijfquery (`update()`, `delete()`) per doorgang telt niet.

`QuotaCountGuard` leest `app` en vindt een `count()` zonder argument die met `>=`, `>`, `<` of `<=` tegen iets anders dan 0 of 1 vergeleken wordt. Zo'n vergelijking vóór een insert houdt geen limiet: twee verzoeken tellen hetzelfde getal en voegen allebei in.

`QuotaSlots` (`app/Modules/Editions/Support/QuotaSlots.php`) houdt de limieten op edities per account en op bijdragen en foto's per box. Elk document neemt de laagste vrije plek onder de limiet; de unieke indexen van `database/migrations/2026_11_27_120000_create_quota_slot_indexes.php` weigeren een plek die een ander verzoek net nam, en dan leest `QuotaSlots` de plekken opnieuw. Wordt een limiet in de config verlaagd, dan houden bestaande documenten hun plek boven de nieuwe limiet; een nieuw document neemt alleen een plek eronder.

Telling: rij `cleanup-load-all` in `scripts/ci-ratchets.sh` telt `->get()`, `->pluck(` en `::all()` in `BoxCleanup` en `PrintCleanup` (een nieuwe opruimklasse ziet de guard), rij `quota-count-checks` telt `->count() >=` en `->count() <` in de bronmappen. Beide staan op 0.

Blinde vlekken: een query die eerst in een variabele staat en dan in een opruimklasse geladen wordt; een lus `for` of `while`, een callback van `chunkById()` of `map()`; een methode van een andere klasse die de lus aanroept; een telling met de limiet links van `<=` in de ratchetrij (de guard ziet die wel).
Review controleert, de guard niet: of een query per pagina in een callback echt per pagina is en niet per document.
