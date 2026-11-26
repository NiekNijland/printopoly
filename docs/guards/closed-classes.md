# Guard: closed-classes

Elke concrete klasse is `final`. Dat houdt de formatterregel `final_class` vast, met de dashboard-rij `open-classes` als teller. `ClosedClassGuard` controleert wat die regel niet ziet.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| closed-concrete-parent | een concrete klasse wordt nooit uitgebreid | maak de ouder `abstract`, of voeg de kinderen in de ouder |
| closed-stale-tag | de docblock-tag `@final` staat alleen op een concrete klasse die open blijft, met een beslisregel | haal de tag weg van een klasse die `final` of `abstract` is |

Review controleert, de guard niet: de reden in de beslisregel van een klasse die open blijft (rubric item 1).
