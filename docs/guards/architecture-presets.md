# Guard: architecture-presets

`PhpPresetGuard` en `SecurityPresetGuard` beslissen wat de presets `php` en `security` van de kit verbieden in de namespaces die `autoload.psr-4` van `composer.json` laadt (`app`, `database/factories`, `database/seeders`). PHPUnit heeft geen preset; elke regel van de preset is hier een detectorklasse.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `php` | geen debuguitvoer, geen proces dat stopt, geen uitvoer buiten de response, geen sprong en geen globale variabele, geen verwijderde database- en patroonfuncties | geef de waarde terug of log hem, gooi een exception, injecteer wat een global zou bevatten |
| `security` | geen zwakke hashes, raadbare willekeur, tijdelijke namen, shellaanroepen, code uit een string, deserialisatie, variabelen uit een array of runtime-asserties | `hash()` met het algoritme, `Str::random()` of `random_int()`, de filesystem- en proceshelpers, JSON |

De guard leest functieaanroepen (ook als first-class callable) en de taalconstructies. Blinde vlek: een functienaam als string-callable.
Telling: `tests/Guards/lists/architecture-presets.txt`, rij `architecture-presets-list` (6 regels: vijf tijdelijke namen, één zwakke hash).
