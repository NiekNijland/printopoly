# Guard: file-size

Een PHP-bestand telt hoogstens 400 regels, tests meegeteld.

`FileSizeGuard` leest het getal uit de zin hierboven en telt de PHP-bestanden in `app`, `bootstrap`, `config`, `database`, `routes`, `resources` en `tests`. Vrijgesteld is alleen een categorie: een databestand, dat niets anders doet dan een lijst teruggeven (`return [...]`).

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| file-size | een PHP-bestand telt hoogstens 400 regels, tests meegeteld | splits naar gedrag: een test in `<Class><Topic>Test.php`, een klasse in de klassen die ze al bevat |

Elk PHP-bestand blijft onder de grens; de guard heeft geen getelde lijst. Het dashboard telt de te lange bestanden in `source-files-over-limit` en `test-files-over-limit`, en de rijen `cap-source-files-over-limit` en `cap-test-files-over-limit` houden die aantallen vast.

Review controleert, de guard niet: of een splitsing naar gedrag gaat en niet naar regelaantal (rubric item 9).
