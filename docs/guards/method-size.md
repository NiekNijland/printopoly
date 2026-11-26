# Guard: method-size

Een methode telt hoogstens 80 regels, een controller-actie hoogstens 40.

`MethodSizeGuard` leest de getallen uit de zin hierboven. Hij telt van de regel met de naam van de methode tot de sluitende accolade; het docblock en de attributen tellen niet mee, een closure in de methode wel. Een controller-actie is een publieke methode, behalve de constructor, van een klasse in een map `Controllers`.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| method-size | een methode telt hoogstens 80 regels | splits de methode naar verantwoordelijkheid, nooit naar regelaantal |
| controller-action-size | een controller-actie telt hoogstens 40 regels | verplaats de logica naar een action van de module en roep die aan |

De methodes van vandaag die te lang zijn, staan in `lists/method-size.txt` (sleutel: pad, klasse, methode en regels). De lijst wordt alleen korter; de ratchet-rij `method-size-list` telt haar regels.

Review controleert, de guard niet: of een splitsing een eigen verantwoordelijkheid oplevert en niet alleen kortere stukken (rubric item 1).
