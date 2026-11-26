# Guard: test-locations

`TestLocationGuard` beslist waar een test staat: in de tiers `Unit` en `Feature` spiegelt het pad de map van de klasse die de test dekt.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `belongs-in` | de test van een klasse staat in de map die de klasse spiegelt | verplaats naar de genoemde map |
| `no-folder` | een flowtest staat in een map die `app` ook heeft, of in de root van de tier | zet hem bij de code die hij dekt |

De guard leest welke klassen en mappen `app` heeft en welke tests de twee tiers hebben. `tests/Guards` en `tests/Smoke` spiegelen niets.
Telling: `tests/Guards/lists/test-locations.txt`, rij `test-locations-list` (18 regels). Stap 5 verplaatst de tests met hun klassen en herschrijft de lijst vanuit de verplaatskaart.
