# Guard: controller-names

Een controller heet `<Area>/<Noun>/<Verb>Controller`: de map `<Area>` is de routegroep, de map `<Noun>` is waar hij op werkt en de klasse is één werkwoord uit de tabel hieronder. `ControllerNameGuard` leest de tabel.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| controller-verb | een controller heet naar een werkwoord uit de tabel | hernoem de controller naar een werkwoord uit de tabel, of zet het nieuwe werkwoord met zijn betekenis in de tabel |
| controller-verb-used | elk werkwoord in de tabel draagt minstens één controller | haal de rij weg; een werkwoord komt in de tabel met de eerste controller die het nodig heeft |

| Werkwoord | Betekenis |
| --- | --- |
| `Close` | sluit iets af voor nieuwe bijdragen |
| `Count` | telt een gebeurtenis |
| `Create` | toont het formulier voor iets nieuws |
| `Delete` | verwijdert iets |
| `Download` | levert een bestand als download |
| `Duplicate` | maakt een kopie |
| `Handle` | verwerkt een terugkoppeling van buiten |
| `Import` | neemt gegevens van buiten over |
| `List` | geeft een lijst als JSON |
| `Logout` | meldt de gebruiker af |
| `Patch` | wijzigt een deel |
| `Redirect` | stuurt door naar een andere URL |
| `Rename` | geeft een nieuwe naam |
| `Renew` | maakt een nieuwe link of sleutel |
| `Replace` | vervangt het geheel |
| `Resolve` | beslist over een ingestuurd voorstel |
| `Show` | toont een pagina of een bestand |
| `Start` | zet een proces in gang |
| `Store` | slaat iets nieuws op |
| `Update` | wijzigt instellingen |

Een controller die nog niet in `<Area>/<Noun>` staat, staat op de lijst van `docs/guards/layout.md`; voor hem leest de guard het werkwoord vooraan zijn naam (`ShowEditionController` draagt `Show`).

Review controleert, de guard niet: of het werkwoord past bij wat de controller doet (rubric item 9).
